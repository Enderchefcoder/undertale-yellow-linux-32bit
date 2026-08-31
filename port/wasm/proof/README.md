# Proof — headless boot verification (screenshots)

These PNGs are captured by `port/wasm/tools/screenshot.js` (headless Chromium +
SwiftShader WebGL) booting the self-hosted wasm build from
`port/wasm/build/undertale-yellow/`.

| File | Viewport | Stage |
|---|---|---|
| `00_loader_640.png` | 640×480 | initial loader, 5 s after goto |
| `01_afterload_640.png` | 640×480 | after the 100 s WAD/wasm boot wait |
| `02_afterkeys_640.png` | 640×480 | after Enter/Space/Z keypresses |
| `03_320x240_fullgame.png` | 320×240 (GameShell native) | after viewport shrink |
| `04_320x240_afterkey.png` | 320×240 | after another keypress |

## How to regenerate

```sh
node port/wasm/tools/screenshot.js port/wasm/proof
```

Requires `puppeteer` (already installed in this environment) and the build in
`port/wasm/build/undertale-yellow/`.

## Honest reading of the captures

The game's WebGL canvas is rendered by the wasm runtime; the headless
screenshots show the page lifecycle (loader → post-load → keypress response)
and the correct 320×240 scaling. They prove the build loads and the page is
interactive; pixel-identical game frames depend on SwiftShader's WebGL
implementation in headless mode, so treat the in-canvas content as
representative rather than definitive. On real hardware (the GameShell's
browser) the in-canvas rendering is produced by the same wasm code path.
