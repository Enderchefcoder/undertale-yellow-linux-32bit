// screenshot.js — boot the self-hosted UTY wasm build headless and capture verified frames.
// Bounded and self-reporting: prints every console/page error, records the boot
// status, writes a JSON report, and only exits 0 when a clean boot is reached.
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const puppeteer = require("puppeteer");

const BUILD = path.resolve(__dirname, "../build/undertale-yellow");
const OUT = process.argv[2] || "/tmp/shot/out";
const MAX_MS = Number(process.env.UTY_MAX_MS || 150000);
fs.mkdirSync(OUT, { recursive: true });
const report = { browser: "", status: [], console: [], consoleErrors: [], pageErrors: [], http4xx: [], failedRequests: [], screenshots: [], booted: false, mainLoop: false, elapsedMs: 0, canvasPixels: null };
const log = (...args) => console.log(...args);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".wasm": "application/wasm", ".data": "application/octet-stream", ".unx": "application/octet-stream", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  // Stub the OpenGX "pages" requests the game makes while self-hosted.
  if (p.includes("undefined") || p.includes("/pages/")) { res.writeHead(200, { "Content-Type": "application/json" }).end("{}"); return; }
  if (p === "/") p = "/index.html";
  const file = path.join(BUILD, p);
  if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end("not found: " + p); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Verify a PNG actually contains rendered content: decode it (zlib + filters)
// and report how many pixels are non-black. The game's WebGL canvas has
// preserveDrawingBuffer=false, so in-page readback is black even though the
// composited frames are real — the composited screenshot is the ground truth.
function pngStats(file) {
  try {
    const data = fs.readFileSync(file);
    let pos = 8, idat = Buffer.alloc(0), w = 0, h = 0, ct = 0;
    while (pos + 8 <= data.length) {
      const ln = data.readUInt32BE(pos);
      const typ = data.toString("ascii", pos + 4, pos + 8);
      const chunk = data.slice(pos + 8, pos + 8 + ln);
      if (typ === "IHDR") { w = chunk.readUInt32BE(0); h = chunk.readUInt32BE(4); ct = chunk[9]; }
      else if (typ === "IDAT") idat = Buffer.concat([idat, chunk]);
      pos += 12 + ln;
    }
    if (!w || !h) return { error: "no IHDR" };
    const raw = zlib.inflateSync(idat);
    const bpp = ct === 6 ? 4 : 3;
    const stride = w * bpp;
    let out = Buffer.alloc(h * stride), prev = Buffer.alloc(stride), i = 0;
    for (let y = 0; y < h; y++) {
      const f = raw[i++];
      const line = Buffer.from(raw.slice(i, i + stride)); i += stride;
      if (f === 1) for (let x = bpp; x < stride; x++) line[x] = (line[x] + line[x - bpp]) & 255;
      else if (f === 2) for (let x = 0; x < stride; x++) line[x] = (line[x] + prev[x]) & 255;
      else if (f === 3) for (let x = 0; x < stride; x++) { const a = x >= bpp ? line[x - bpp] : 0; line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255; }
      else if (f === 4) for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      line.copy(out, y * stride);
      prev = line;
    }
    let sum = 0, nonBlack = 0;
    for (let j = 0; j < out.length; j += bpp) { const v = (out[j] + out[j + 1] + out[j + 2]) / 3; sum += v; if (v > 8) nonBlack++; }
    return { w, h, avg: Math.round(sum / (out.length / bpp)), nonBlackPct: Math.round((nonBlack / (out.length / bpp)) * 100) };
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}

function findChrome() {
  const cache = path.join(require("os").homedir(), ".cache/puppeteer/chrome");
  let best = null;
  if (fs.existsSync(cache)) {
    for (const dir of fs.readdirSync(cache)) {
      const bin = path.join(cache, dir, "chrome-linux64", "chrome");
      if (fs.existsSync(bin) && (!best || dir > best.dir)) best = { dir, bin };
    }
  }
  return best ? best.bin : null;
}

(async () => {
  const t0 = Date.now();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let executablePath = process.env.CHROMIUM_PATH || findChrome();
  if (!executablePath) executablePath = undefined;
  report.browser = executablePath || "(puppeteer default)";
  log("browser:", report.browser);
  // SwiftShader WebGL only works here with the GPU in the browser process.
  // Explicit ANGLE/SwiftShader flags stall large responses, so keep them off
  // and let Chrome pick its default software GL.
  const defaultArgs = ["--no-sandbox", "--disable-dev-shm-usage", "--in-process-gpu", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"];
  const args = process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(" ") : defaultArgs;
  const browser = await puppeteer.launch({ executablePath, headless: "new", args });
  const page = await browser.newPage();
  // Page-side console tape: CDP console events can be dropped while the main
  // thread is saturated by the wasm loop, so mirror every call into a global.
  await page.evaluateOnNewDocument(() => {
    window.__UTY_LOGS = [];
    for (const k of ["log", "info", "warn", "error", "debug"]) {
      const orig = console[k].bind(console);
      console[k] = (...a) => {
        try {
          const s = a.map((x) => { try { return typeof x === "string" ? x : JSON.stringify(x); } catch (e) { return String(x); } }).join(" ");
          window.__UTY_LOGS.push(k + ": " + s);
          if (window.__UTY_LOGS.length > 2000) window.__UTY_LOGS.splice(0, 1000);
        } catch (e) {}
        orig(...a);
      };
    }
  });
  page.on("console", (m) => {
    const t = m.text();
    if (t) report.console.push(t.slice(0, 300));
    if (m.type() === "error") { report.consoleErrors.push(t); log("[console:error]", t.slice(0, 500)); }
    else if (/Entering main loop\./.test(t)) { report.mainLoop = true; log("[main-loop]"); }
  });
  page.on("pageerror", (e) => { const t = (e && e.stack) || String(e); report.pageErrors.push(t); log("[pageerror]", t.slice(0, 1500)); });
  page.on("requestfailed", (r) => { const e = (r.failure() && r.failure().errorText) || "?"; report.failedRequests.push(r.url().slice(0, 200) + " " + e); log("[requestfailed]", r.url().slice(0, 200), e); });
  page.on("response", (r) => { if (r.status() >= 400) { report.http4xx.push(r.status() + " " + r.url()); log("[http " + r.status() + "]", r.url().slice(0, 300)); } });
  await page.setViewport({ width: 640, height: 480 });
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, "00_loader_640.png") }); report.screenshots.push("00_loader_640.png");

  // Boot signal: the game itself marks its main loop by showing the canvas
  // (display:block, .active) and clearing the loader status. Nothing else sets
  // that combination, so it is the runner's own "game is running" flag.
  const gameState = async () => {
    try {
      return await page.evaluate(() => {
        const c = document.getElementById("canvas");
        const cs = c ? getComputedStyle(c) : null;
        return {
          canvasVisible: !!(c && cs && cs.display !== "none" && c.width > 0),
          canvasActive: !!(c && c.classList.contains("active")),
          status: (document.getElementById("status") || {}).textContent || "",
          logs: (window.__UTY_LOGS || []).slice(-80),
        };
      });
    } catch (e) { return { error: String(e).slice(0, 200) }; }
  };

  const started = Date.now();
  let lastTimeline = Date.now();
  let bootedAt = -1;
  while (Date.now() - started < MAX_MS) {
    if (report.pageErrors.length || report.http4xx.length || report.failedRequests.length) break;
    const s = await gameState();
    if (s.error) log("state error:", s.error);
    if (s.status) log("status:", s.status.slice(0, 120));
    if (Date.now() - lastTimeline > 20000) { lastTimeline = Date.now(); const name = "t_" + Math.round((Date.now() - started) / 1000) + "s.png"; await page.screenshot({ path: path.join(OUT, name) }); report.screenshots.push(name); log("timeline capture", name); }
    if (s.canvasVisible && s.canvasActive && !report.pageErrors.length) {
      if (bootedAt === -1) {
        bootedAt = Date.now(); report.booted = true; report.elapsedMs = Date.now() - started;
        log("BOOTED (canvas active + visible) after " + report.elapsedMs + "ms");
      }
      if (Date.now() - bootedAt > 12000) {
        log("stable for 12s — capturing proof frames");
        // Capture with retries: a keypress can land on a screen transition,
        // so if a frame comes out black, wait and retake it. We never ship a
        // black or empty frame as gameplay proof.
        const capture = async (name, waitMs) => {
          await sleep(waitMs);
          const p = path.join(OUT, name);
          for (let attempt = 0; attempt < 5; attempt++) {
            await page.screenshot({ path: p });
            const s = pngStats(p);
            log(name, "attempt", attempt + 1, JSON.stringify(s));
            if (!s.error && s.nonBlackPct > 3) return true;
            await sleep(3000);
          }
          return false;
        };
        let ok = true;
        ok = (await capture("01_afterload_640.png", 1000)) && ok;
        report.screenshots.push("01_afterload_640.png");
        await page.keyboard.press("KeyZ"); // confirm/skip on the current screen
        ok = (await capture("02_afterkeys_640.png", 3500)) && ok;
        report.screenshots.push("02_afterkeys_640.png");
        await page.setViewport({ width: 320, height: 240 }); // GameShell resolution
        ok = (await capture("03_320x240_fullgame.png", 2500)) && ok;
        report.screenshots.push("03_320x240_fullgame.png");
        await page.keyboard.press("Enter");
        ok = (await capture("04_320x240_afterkey.png", 3500)) && ok;
        report.screenshots.push("04_320x240_afterkey.png");
        log("proof frames all captured:", ok);
        break;
      }
    }
    await sleep(2500);
  }
  report.elapsedMs = Date.now() - started;
  const finalLogs = await page.evaluate(() => (window.__UTY_LOGS || []).slice(-120)).catch(() => []);
  report.pageLogs = finalLogs;
  for (const name of report.screenshots) {
    const p = path.join(OUT, name);
    if (fs.existsSync(p)) report.pngStats = Object.assign(report.pngStats || {}, { [name]: pngStats(p) });
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
  // Verified only when the game booted its main loop cleanly and the proof
  // frames actually contain rendered (non-black) content.
  const proofNames = ["01_afterload_640.png", "02_afterkeys_640.png", "03_320x240_fullgame.png", "04_320x240_afterkey.png"];
  const proofs = proofNames.map((n) => report.pngStats && report.pngStats[n]);
  const proofsHaveContent = proofs.length === 4 && proofs.every((s) => s && !s.error && s.nonBlackPct > 3);
  const clean = report.booted && !report.pageErrors.length && !report.http4xx.length && !report.failedRequests.length && report.consoleErrors.length === 0 && proofsHaveContent;
  if (clean) { log("VERIFIED: clean boot, " + report.screenshots.length + " screenshots, proof frames have content"); process.exitCode = 0; }
  else {
    log("NOT VERIFIED: booted=" + report.booted + " pageErrors=" + report.pageErrors.length + " http4xx=" + report.http4xx.length + " failedRequests=" + report.failedRequests.length + " consoleErrors=" + report.consoleErrors.length + " proofsHaveContent=" + proofsHaveContent);
    log("proof stats:", JSON.stringify(report.pngStats));
    process.exitCode = 1;
  }
})().catch((e) => { console.error("FATAL", (e && e.stack) || e); process.exitCode = 2; });
