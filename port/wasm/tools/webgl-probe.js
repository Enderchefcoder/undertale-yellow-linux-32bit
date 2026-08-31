// webgl-probe.js — find a headless Chrome config that exposes WebGL to the page.
const puppeteer = require("puppeteer");

const ARG_SETS = {
  A: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
  B: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  C: ["--no-sandbox", "--disable-gpu", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
  D: ["--no-sandbox", "--use-gl=egl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
};

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((res) => setTimeout(() => res("<" + label + " timeout>"), ms)),
  ]);

const probeOne = async (headless, name, args) => {
  const b = await withTimeout(puppeteer.launch({ headless, args }), 40000, "launch");
  if (typeof b === "string") return console.log(`${headless} / ${name} -> ${b}`);
  const page = await b.newPage();
  const r = await withTimeout(
    page.evaluate(() => {
      const c = document.createElement("canvas");
      const gl1 = c.getContext("webgl", { failIfMajorPerformanceCaveat: false });
      const gl2 = c.getContext("webgl2");
      const g = gl1 || gl2;
      return {
        webgl: !!gl1,
        webgl2: !!gl2,
        renderer: g ? g.getParameter(g.RENDERER) : null,
        version: g ? g.getParameter(g.VERSION) : null,
      };
    }),
    20000,
    "eval"
  );
  console.log(`${headless} / ${name} -> ${JSON.stringify(r)}`);
  await withTimeout(b.close().catch(() => {}), 15000, "close");
};

(async () => {
  setTimeout(() => { console.log("FAILSAFE"); process.exit(0); }, 200000);
  for (const headless of ["new", "shell"]) {
    for (const [name, args] of Object.entries(ARG_SETS)) {
      try {
        await probeOne(headless, name, args);
      } catch (e) {
        console.log(`${headless} / ${name} -> ERROR ${String(e).slice(0, 140)}`);
      }
    }
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });