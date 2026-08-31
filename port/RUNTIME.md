# RUNTIME.md — The decision that actually matters

You already have, or will shortly have, a clean `data.win` (the whole game in
portable form). The entire project now reduces to one hard problem:

> **Which executable can load a GameMaker **GMS2** `data.win` and run it on a
> 32-bit ARMv7 (Allwinner R16) Linux?**

Everything below ranks the options by how likely each is to *actually work* on
your exact chip, and what each actually costs. Read it before spending weeks.

---

## The one-line decision

- Want it **working today on this chip** (and keeping Linux, no reflash): the
  **WebAssembly route — endgame A′** is the closest practical near-lossless
  path. It runs UTY's *same game* as `wasm32` in a JIT'd browser; no x86, no
  Box86, no hand-built runner. See `port/wasm/README.md`.
- Want the **technically-correct native port**: **endgame A** — an ARMv7 GMS2
  `data.win` runner. This does not exist as a ready binary; it has to be
  produced (research-grade).
- **Box86 (endgame B)** is only useful if a **32-bit x86 Linux** build of UTY
  materializes (none exists; it cannot run UTY's 64-bit x86_64 Linux build,
  and its sibling Box64 needs a 64-bit *ARM* host).

---

## Endgame A′ — WebAssembly (wasm32) web build in a kiosk browser (recommended)

**What it is.** GameMaker also exports a game as a **wasm32** web build. wasm32 is
architecture-independent and *32-bit by construction*; the console's browser
JIT-compiles it straight to Cortex-A7 ARM instructions. There is no x86 to
translate, no bitness barrier, no Android, no custom runner, and no reflash.

**Why it fits this chip the best.** The hard blocker for the other endgames was
"no GMS2 `data.win` runner exists for ARMv7." The web release skips `data.win`
entirely — the engine runs in the already-maintained browser, and the game is
the web build's own artifact. UTY is a turn-based 2D RPG, so it tolerates the
modest framerates a 1 GHz Cortex-A7 / 1 GB RAM squeeze from one kiosk tab; and
its 320×240 screen is cheap to render.

**Honest caveats.** (1) There is **no official** HTML5/wasm release — official
builds are Windows/macOS/Linux; community self-hosted web ports circulate and
people do run them, but verify a build boots to the menu on a desktop browser
before copying it to the console. (2) It needs a display server (X11/Wayland)
and a wasm-capable browser; `port/wasm/` supplies `serve.sh`, `kiosk.sh`, and
`install-browser.sh`. (3) `wasm32` has a 4 GiB address space and no raw pointer
hacks — every GameMaker web export already lives inside those limits, so UTY's
port to wasm is the same one GameMaker produces for any browser.

**Odds / cost on the R16:** medium-to-good, and it is mostly*assembly* (install
a browser, copy a web build, serve, kiosk) rather than reverse engineering. This
is the route to try first on *your* console.

---

## Endgame A — Run `data.win` under an ARM-native GameMaker runner

**What it is.** GameMaker (GMS) engines for ARM exist inside GameMaker's own
exports (Android) and in community reimplementations. The game's bytecode in
`data.win` is interpretation-target-agnostic. Point an ARM-capable GMS2 VM
interpreter at it and it runs.

**Known concrete candidates:**

1. **The Android build of UTY (arm64-only today).** UTY already got an Android
   port on GameJolt, which *proves* the `data.win` can be played outside the
   Windows shell. That APK is 64-bit-only — it will **not** run on your
   Cortex-A7. But its author (and the toolchain they used) is the single most
   useful person to talk to for shaving it down to armv7.
2. **`UndertaleModTool` recompile (desktop, transfers the data).** UMT can
   decompile + recompile a GMS2 `data.win`, and bundles official runners for
   Windows/macOS/Linux *x86_64*. None of those is armv7, so UMT alone won't
   execute on your chip — but it is how you *prepare* a portable build and how
   you get authoritative engine/bytecode answers.
3. **`gmrs` (Rust GMS runner).** Community reimplementation that already plays
   GameMaker games, and compiles for Linux. Pure cross-compilable Rust is your
   best shot at an armv7 binary *without* GameMaker's license. Caveat: gmrs
   targets **GMS 1.4** format, so it loads Undertale/Deltarune-era `data.win`s —
   if your inspector confirms UTY is **GMS2** format, gmrs will need significant
   work to accept it. Do the inspect step before betting here.
4. **PortMaster-style pipelines.** PortMaster is the ecosystem that ports
   GameMaker games to cheap ARM handhelds — but it supports **arm64/aarch64**
   only and dropped 32-bit. Treat it as a *reference for technique*, not an
   installable runtime on your R16.

**Honest odds / cost on the R16:** no off-the-shelf binary exists; you are
writing or finishing a runner. Days-to-weeks of reverse engineering with real
frustration potential, on a 4×~1GHz Cortex-A7 that will run a 2D pixel RPG
slowly-but-playably if the interpreter is efficient. This is the "real port."

---

## Endgame B — A 32-bit x86 Linux build, run under Box86

**What it is.** Box86 translates 32-bit x86 Linux binaries to ARM. If someone
(the UTY or UndertaleModTool community) produced a **32-bit x86 Linux** player
for UTY's `data.win`, Box86 on your R16 would run it.

**Odds:** UTY ships no official 32-bit x86 Linux build. Producing one from the
`data.win` is basically *this* project again (see endgame A; a 32-bit Linux GMS
player is the same scarce artifact). Box86 infrastructure is proven and
installable (`install-box86.sh`), but its usefulness is blocked on that build
existing.

---

## Endgame C — Pragmatic recommendation

If the real goal is *"I want to experience Undertale Yellow for the first time,
without bullshit"* — do not chain yourself to the R16 for this one game. The
same `data.win` runs well on:
- **any ARM64 handheld** via PortMaster/Box64, or
- **a desktop/laptop** (official Windows build, or Linux via the community port).

And keep the R16 for games that are a fair fight for it. If you are set on the
R16 as a personal challenge (respect), pursue **endgame A** with the community's
help, then teach us all how you did it.

---

## Suggested execution order on the R16

0. **Try the WebAssembly route first** (keeps Linux, no reflash): get a complete
   HTML5/wasm build of UTY, then `sh port/wasm/serve.sh --dir <web-build> --run`
   and `sh port/wasm/kiosk.sh --run`. If a verified web build won't boot on the
   console, that's not translating the game — that's a web-build/perf problem,
   and the desktop-check in port/wasm/README.md will have flagged it early.
1. `sh detect.sh` — confirm armv7 + what you have.
2. Download UTY's zip; `sh extract-data.win.sh <zip> --extract`.
3. `python3 inspect-data.win.py work/data.win --scan` — directional engine read.
4. Open the `data.win` in **UndertaleModTool** on a desktop; record exact engine
   version + whether bytecode is 64-bit. That one number decides endgame A's
   shape. (The UTY fandom modding scene already uses UMT on this file.)
5. Take that result to the people in `LINKS.md` who already made UTY run outside
   Windows (Android port author; the Pi/GameMaker crowd; Underminers). Pick the
   candidate runner, build it for `arm-linux-gnueabihf`, and iterate.

## Mistakes to avoid

- Buying "make the 64-bit exe 32-bit" tooling — it does not exist.
- Expecting Box86/Wine to play it — UTY is 64-bit; Wine-on-32-bit-ARM is dead.
- Assuming UMT's bundled runners make it ARM-capable — they are x86_64.
- Giving up because the .exe is 64-bit — the .exe doesn't matter; `data.win` does.
- Overlooking the **web build** as a form of the game — for *this* chip the
  wasm release (port/wasm/) is the most practical near-lossless route and needs
  no custom runner at all.