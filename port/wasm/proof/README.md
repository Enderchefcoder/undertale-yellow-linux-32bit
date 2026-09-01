# Proof — verified boot capture

These screenshots are **verified captures of the self-hosted UTY wasm build
booting and rendering** in a headless Chromium. The harness (`port/wasm/tools/screenshot.js`)
exits 0 only when:

- the game's own main-loop signal fires (canvas visible + `active` class,
  loader status cleared) — nothing else sets that combination,
- there are no page errors, no console errors, no failed requests, and no
  HTTP 4xx/5xx responses, and
- every proof frame decodes to real rendered content (>3% non-black pixels).

Run it yourself:

```sh
bun add --dev puppeteer
node port/wasm/tools/screenshot.js port/wasm/proof
# look for: VERIFIED: clean boot, 5 screenshots, proof frames have content
```

## What the frames show

| Frame | What it proves |
|---|---|
| `00_loader_640.png` | The page shell + loading spinner before the runner starts. |
| `01_afterload_640.png` | Game booted: the runner's intro/menu screen is rendered (30% non-black pixels). |
| `02_afterkeys_640.png` | The game **responds to input**: after pressing Z the screen changed (room-transition frame with the game's name banner). |
| `03_320x240_fullgame.png` | The same running game at the **GameShell's native 320×240** — full screen visible, nothing clipped. |
| `04_320x240_afterkey.png` | Input still works at 320×240 (frame changed after Enter). |

All five PNGs above were regenerated from a clean capture that reported **zero**
page errors, console errors, failed requests, or HTTP 4xx/5xx responses.

## Honest scope

- **Verified:** the wasm32 build boots to its main loop, renders real game
  frames, and accepts input at 640×480 and 320×240 in a software-rendered
  Chromium — which is the same class of environment as the GameShell's browser
  (the console's GPU does not have to be used; SwiftShader-style rendering is
  the fallback the kiosk script enables).
- **Not yet implemented:** the battle soul-box zoom for small screens. That
  requires editing the GameMaker source (`port/uty-decomp`) and rebuilding the
  game export; it is a separate task from making the web build boot. Until it
  is done and captured, no battle screenshot is claimed.

## Regeneration details

Capture environment used in the last verified run:

```text
browser: ~/.cache/puppeteer/chrome/linux-152.0.7977.54/chrome-linux64/chrome
args:    --no-sandbox --disable-dev-shm-usage --in-process-gpu
         --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-webgl
boot:    BOOTED (canvas active + visible) after ~5.5 s
result:  VERIFIED: clean boot, 5 screenshots, proof frames have content
```

The `--in-process-gpu` flag is required: with the GPU in a separate process,
SwiftShader stalls on the 248 MB `game.unx` transfer in this environment.
