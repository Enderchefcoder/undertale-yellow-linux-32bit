# port/wasm/ — the near-lossless WebAssembly route (recommended on the R16)

This is the route the original toolkit under-weighted. GameMaker also exports
Undertale Yellow's *same game logic and assets* to a **WebAssembly (wasm32)**
web build. wasm32 is:

- **architecture-independent** — there is no x86 and no bitness problem; and
- **32-bit by construction** — about as "32-bit" as a build can get; and
- **executed natively on your Cortex-A7** — the browser JIT-compiles wasm to
  ARM instructions, with no Box86, no Wine, no hand-built GMS2 runner, and no
  reflash. That is the closest practical match to "play it almost losslessly on
  a 32-bit ARM Linux console."

## Why this beats the original endgames *on this chip*

- Endgame A (run `data.win` under an ARMv7 GMS2 runner): still correct in
  principle, but no such runner exists and building one is a research project.
  The web release skips `data.win` entirely — no runner to build.
- Endgame B (Box86 + a 32-bit x86 Linux build): no such build exists.
  Box86 cannot touch the 64-bit x86_64 Linux build.

## Honest caveats (read before committing)

1. **There is no *official* HTML5/wasm release of UTY.** The official builds are
   Windows/macOS/Linux. Working self-hosted web ports circulate in the community
   (they demonstrably exist and people self-host them), but provenance and
   completeness vary — verify the build boots to the menu on a desktop browser
   *before* fighting the console.
2. **The browser is the whole cost.** On a 1 GHz Cortex-A7 with 1 GB RAM, one
   kiosk browser tab is workable but not luxurious. UTY is a turn-based 2D RPG,
   so it tolerates modest framerates well. 320x240 is cheap to render.
3. **You need a display server** (X11 or Wayland) to run a browser fullscreen.
   `kiosk.sh` probes for one and tells you what's missing rather than guessing.

## The pipeline

1. Get a complete HTML5/wasm build of UTY (community, self-hostable files:
   `index.html` + a `html5game/` or `.wasm` + JS). Put it in a folder.
2. `sh serve.sh --dir <that folder> --run`  -> serves it at `http://127.0.0.1:8080`
3. `sh kiosk.sh`                            -> opens it fullscreen in the best browser
4. (optional) fold `serve.sh` + `kiosk.sh` into an autostart so it boots to the game.

## Files

- `serve.sh`           — tiny static server (python3 http.server, else busybox httpd)
- `kiosk.sh`           — requires a display server; finds best browser and kiosks it
- `install-browser.sh` — apt-installs a wasm-capable browser if none present

Run any of them (before you give them flags) for a dry-run of exactly what they do.