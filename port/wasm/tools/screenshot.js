// screenshot.js — boot the self-hosted UTY wasm build and capture verified frames.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer");

const BUILD = path.resolve(__dirname, "../build/undertale-yellow");
const OUT = process.argv[2] || "/tmp/shot/out";
const BOOT_TIMEOUT = Number(process.env.UTY_BOOT_TIMEOUT_MS || 120000);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".wasm":"application/wasm", ".data":"application/octet-stream", ".unx":"application/octet-stream", ".png":"image/png" };
const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split("?")[0]);
  if (requestPath === "/") requestPath = "/index.html";
  const file = path.join(BUILD, requestPath);
  if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end("not found: " + requestPath);
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function browserPath() {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  for (const candidate of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]) {
    if (!fs.existsSync(candidate)) continue;
    try { const version = execFileSync(candidate, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); if (!/snap/i.test(version)) return candidate; } catch {}
  }
  throw new Error("No usable Chromium binary. Set CHROMIUM_PATH.");
}
(async () => {
  const errors = [];
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: browserPath(), headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push("pageerror: " + (error.stack || error)));
  page.on("requestfailed", (request) => errors.push("requestfailed: " + request.url()));
  page.on("response", (response) => { if (response.status() >= 400) errors.push("HTTP " + response.status() + ": " + response.url()); });
  await page.setViewport({ width: 640, height: 480 });
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, "00_loader_640.png") });
  await sleep(BOOT_TIMEOUT);
  const status = await page.$eval("#status", (element) => element.textContent || "");
  if (errors.length || /Exception thrown|Aborted\(/i.test(status)) throw new Error("Runtime verification failed:\n" + errors.join("\n") + "\nstatus: " + status);
  await page.screenshot({ path: path.join(OUT, "01_afterload_640.png") });
  for (const key of ["Enter", "Space", "KeyZ"]) { await page.keyboard.press(key); await sleep(500); }
  await page.screenshot({ path: path.join(OUT, "02_afterkeys_640.png") });
  await page.setViewport({ width: 320, height: 240 }); await sleep(1000);
  await page.screenshot({ path: path.join(OUT, "03_320x240_fullgame.png") });
  await page.keyboard.press("Enter"); await sleep(500);
  await page.screenshot({ path: path.join(OUT, "04_320x240_afterkey.png") });
  await browser.close(); server.close(); console.log("VERIFIED: clean boot and screenshots");
})().catch((error) => { console.error("FAILED:", error.stack || error); process.exitCode = 1; });
