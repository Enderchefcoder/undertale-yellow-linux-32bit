# Undertale Yellow — 32-bit ARM (Allwinner R16) port toolkit

You built a handheld around the **Allwinner R16** SoC (4× Cortex-A7, ARMv7
fully 32-bit). You want to play **Undertale Yellow** on it.

This repo is a real, runnable toolkit for that job. It does all the steps that
can be done, and it is brutally honest about the one step that cannot yet be
done with public tools.

> TL;DR for your exact chip:
> - Playing the **64-bit Windows exe on this chip is impossible** — no tool
>   converts 64-bit machine code or a 64-bit GameMaker build down to a 32-bit
>   ARM core. Not Box64, not Wine, not qemu-user. This is not a skill gap.
> - Undertale Yellow is a **GameMaker (GMS2, VM-compiled)** game. Everything
>   that *is* the game — logic bytecode, sprites, rooms, audio — lives in one
>   portable file, **`data.win`**. The `.exe` is just GameMaker's player shell.
> - That portability is your real opening: the way to run UTY on ARM is **not**
>   to translate a binary, but to **run `data.win` under an ARM-capable
>   GameMaker runner**.
> - **The catch, stated plainly:** there is no maintained, publicly available
>   GameMaker GMS2 runner that runs on 32-bit ARMv7 Linux today. Getting one is
>   the entire difficulty of this project, and on a Cortex-A7 it is a
>   research-grade effort with modest odds and slow expected framerates. This
>   toolkit gets you 100% of the way to that final step and maps exactly how to
>   attack it.

## Honest feasibility verdict (read this first)

Your chip (Cortex-A7) is inside the window that **Box86** supports — Box86
translates *32-bit x86* Linux programs onto 32-bit and 64-bit ARM, and it is
what people use to run old 32-bit GameMaker/Undertale builds on Pis and
handhelds. But:

- UTY's shipped builds are **64-bit**, and **Box86 cannot run 64-bit x86**
  code (Box64, its 64-bit sibling, needs a 64-bit *ARM* host — you don't have
  one).
- There is no official 32-bit x86 Linux build of UTY to feed Box86.
- Wine-with-Box86 for 32-bit ARM essentially does not work for games.

So the endgames are, in order of practicality **on this specific chip** — and
**one of them is new here and is the recommended near-lossless route**:

1. **Play the WebAssembly (wasm32) web build in a kiosk browser.** game's same
   logic + assets exported as `wasm32`: architecture-independent, 32-bit by
   construction, JIT-compiled natively by the Cortex-A7 browser. No x86, no
   Box86, no custom GMS2 runner, no reflash. This is the closest practical match
   to "make it 32-bit almost losslessly." Implementation lives in `port/wasm/`.
   Caveat: there is no *official* HTML5/wasm release, so a complete community
   self-hosted web build must be sourced and verified (see `port/wasm/README.md`).
2. **Find/build an ARMv7 runner for GMS2 `data.win` (the "correct" port).**
   Highest technical ceiling, hardest to reach. See `port/RUNTIME.md`.
3. **A 32-bit x86 Linux build of UTY, run under Box86.** Requires getting the
   community to produce such a build; it exists for other GameMaker games.
   Deployed here via `port/install-box86.sh`.
4. **Honest off-ramp for "just works, no latency":** this chip is far outside
   GameMaker's supported window. UTY's `data.win` runs great on an ARM64
   handheld (PortMaster/Box64) or any desktop. The R16 can get to it, but it
   will be iterative.

The toolkit pursues endgames 1–3 on the R16. If your actual priority is "just
want to play it first try," do route 1 (`port/wasm/`).

## How the game is put together (the mental model)

```
Undertale Yellow Windows build
 ├─ .exe          <- GameMaker Windows player shell (64-bit; bitness irrelevant to us)
 └─ data.win     <- THE GAME. Portable GameMaker bytecode + all assets. THIS is what we port.
```

Everything below is about extracting, validating, and running that single
`data.win` file on ARM.

## Using this toolkit

All scripts are meant to be read first, then run. They only read/discover — none
of them install anything without a `--install` / explicit flag, and none of them
modify your game files.

```bash
cd port

# 1. What hardware/software are we dealing with?
sh detect.sh

# 2. Pull data.win out of the UTY zip you downloaded (give it the zip path)
sh extract-data.win.sh /path/to/UndertaleYellow.zip

# 3. Confirm engine version + VM-vs-YYC (tells you which runner can load it)
python3 inspect-data.win.py ./data.win

# 4. Fallback path: Box86, if a 32-bit x86 Linux build is ever obtained
sh install-box86.sh --install   # or omit flag for a dry-run summary
```

## Steps you must do yourself (can't be automated from here)

- **Get an official UTY download** from
  <https://gamejolt.com/games/UndertaleYellow/136925> and put the zip into work
  on your PC or console. GameJolt requires clicking through the page; there is
  no stable public API file I can fetch from here.
- **Source a complete HTML5/wasm web build of UTY** (community, unofficial —
  there is no official web release). Verify it boots to the menu on a desktop
  browser before copying it to the console. `port/wasm/` then serves + kiosks it.
- **Decide the route** using `port/RUNTIME.md`, then execute it. Endgame gaps
  (custom GMS2 ARMv7 runner; 32-bit x86 build) may need the UTY /
  UndertaleModTool / PortMaster communities. See `port/LINKS.md`.

## Directory map

- `port/detect.sh` — environment discovery (arch, OS, browsers, display server, runners)
- `port/extract-data.win.sh` — extract the game data out of the official UTY zip
- `port/inspect-data.win.py` — read the `data.win` header; directional engine/VM read
- `port/install-box86.sh` — Box86 build for ARMv7/ARM64 (the x86 fallback path)
- `port/wasm/` — **the recommended near-lossless route**: serve + kiosk + install-
  browser for the WebAssembly (wasm32) web build of UTY
- `port/RUNTIME.md` — decision tree for the routes, with honest success estimates
- `port/LINKS.md` — the people and tools that hold the missing GMS2-on-ARM runner

## What "done" looks like

You press a button on the handheld, and UTY's `data.win` boots under a
GameMaker-compatible ARM runner. You get to the menu, then Clover, then a
battle, at a playable-enough framerate for a 2D pixel RPG on a 1GHz Cortex-A7.
That endgame is achievable but genuinely requires closing the GMS2-on-armv7runner gap documented here.

## Screenshot proof

The checked-in web-build proof is visible here:

| Loader | Loaded | GameShell size |
|---|---|---|
| [![loader](port/wasm/proof/00_loader_640.png)](port/wasm/proof/00_loader_640.png) | [![loaded](port/wasm/proof/01_afterload_640.png)](port/wasm/proof/01_afterload_640.png) | [![320×240](port/wasm/proof/03_320x240_fullgame.png)](port/wasm/proof/03_320x240_fullgame.png) |

Additional keypress captures are documented in [`port/wasm/proof/README.md`](port/wasm/proof/README.md). These artifacts verify the local web build's load lifecycle, keyboard interaction, and 320×240 scaling; they are not proof of a native ARMv7 runner or battle-specific zoom.
