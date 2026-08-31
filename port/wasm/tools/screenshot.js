// screenshot.js — boot the self-hosted UTY wasm build headless and capture PNGs.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
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
const shot = (page, name, maxMs) => Promise.race([
  page.screenshot({ path: path.join(OUT, name) }).then(() => "ok"),
  sleep(maxMs || 9000).then(() => "timeout"),
]);

function browserPath() {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  for (const candidate of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]) {
    if (fs.existsSync(candidate)) {
      try {
        const version = execFileSync(candidate, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        if (!/snap/i.test(version)) return candidate;
      } catch {}
    }
  }
  throw new Error("No usable system Chromium found. Set CHROMIUM_PATH to a non-snap Chromium binary.");
}

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  console.log("serving at http://127.0.0.1:" + port);
  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[console:" + m.type() + "]", m.text().slice(0, 1000)));
  page.on("pageerror", (e) => console.log("[pageerror]", e && e.stack ? e.stack.slice(0, 2000) : String(e)));
  page.on("requestfailed", (r) => console.log("[reqfail]", r.url().slice(0, 300)));
  page.on("response", (r) => { if (r.status() >= 400) console.log("[http " + r.status() + "]", r.url().slice(0, 300)); });

  const failsafe = setTimeout(() => { console.error("FAILSAFE exit"); process.exit(1); }, 280000);
  await page.setViewport({ width: 640, height: 480 });
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(5000); await shot(page, "00_loader_640.png");
  await sleep(100000); await shot(page, "01_afterload_640.png", 12000);
  for (const key of ["Enter", "Space", "KeyZ"]) { await page.keyboard.press(key); await sleep(1500); }
  await sleep(2000); await shot(page, "02_afterkeys_640.png", 12000);
  await page.setViewport({ width: 320, height: 240 }); await sleep(4000); await shot(page, "03_320x240_fullgame.png", 12000);
  await page.keyboard.press("Enter"); await sleep(2000); await shot(page, "04_320x240_afterkey.png", 12000);
  clearTimeout(failsafe); await browser.close(); console.log("DONE");
})().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });