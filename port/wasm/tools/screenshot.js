// screenshot.js — boot the self-hosted UTY wasm build headless and capture PNGs.
// Proves it boots and shows how it scales at the GameShell's 320x240.
//
// Why no evaluate-polling: while the 248 MB WAD loads, the wasm saturates the
// page main thread, so CDP round-trips stall. We use fixed waits + a failsafe
// exit timer instead.
//
// Run:  node port/wasm/tools/screenshot.js [out-dir]
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const BUILD = path.resolve(__dirname, "../build/undertale-yellow");
const OUT = process.argv[2] || "/tmp/shot/out";
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".unx": "application/octet-stream",
  ".png": "image/png",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(BUILD, p);
  if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found: " + p);
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name, maxMs) =>
  Promise.race([
    page.screenshot({ path: path.join(OUT, name) }).then(() => "ok"),
    sleep(maxMs || 9000).then(() => "timeout"),
  ]);

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  console.log("serving at http://127.0.0.1:" + port);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
    ],
  });
  const page = await browser.newPage();
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error") console.log("[console:error]", m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => console.log("[pageerror]", e && e.stack ? e.stack.slice(0, 1000) : String(e).slice(0, 1000)));
  page.on("requestfailed", (r) => console.log("[reqfail]", r.url().slice(0, 140)));
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("[http " + r.status() + "]", r.url().slice(0, 160));
  });
  page.on("console", async (m) => {
    if (m.type() === "error") {
      const values = await Promise.all(m.args().map((arg) => arg.jsonValue().catch(() => "<unserializable>")));
      console.log("[console:error:details]", JSON.stringify(values).slice(0, 2000));
    }
  });

  // Failsafe: always exit so logs are flushed and the command never hangs.
  const failsafe = setTimeout(() => { console.log("FAILSAFE exit"); process.exit(0); }, 280000);

  await page.setViewport({ width: 640, height: 480 });
  console.log("goto ...");
  await Promise.race([
    page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded" }),
    sleep(20000).then(() => console.log("(goto timed out — continuing)")),
  ]);
  console.log("goto done");

  await sleep(5000);
  console.log("shot loader (5s)"); await shot(page, "00_loader_640.png", 8000);

  console.log("waiting 100s for WAD/wasm boot ..."); await sleep(100000);
  console.log("shot after 100s"); await shot(page, "01_afterload_640.png", 12000);

  for (const k of ["Enter", "Space", "KeyZ"]) {
    try { await page.keyboard.press(k); } catch {}
    await sleep(1500);
  }
  await sleep(2000);
  console.log("shot after keys"); await shot(page, "02_afterkeys_640.png", 12000);

  console.log("shrink to 320x240 ...");
  await page.setViewport({ width: 320, height: 240 });
  await sleep(4000);
  console.log("shot 320x240"); await shot(page, "03_320x240_fullgame.png", 12000);
  try { await page.keyboard.press("Enter"); } catch {}
  await sleep(2000);
  await shot(page, "04_320x240_afterkey.png", 12000);

  clearTimeout(failsafe);
  console.log("DONE");
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); try { process.exit(1); } catch {} });