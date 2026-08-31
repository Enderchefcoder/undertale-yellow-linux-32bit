# LINKS.md — People and tools that hold the missing piece

The genuinely hard part (an ARMv7 runner that loads a GMS2 `data.win`) is not
something one person builds in a vacuum. These are the exact places the answer
already lives or will come from.

## The game
- Undertale Yellow (official GameJolt): https://gamejolt.com/games/UndertaleYellow/136925
- Wikipedia — confirms **Engine: GameMaker Studio**: https://en.wikipedia.org/wiki/Undertale_Yellow
- UTY fandom wiki — engine + history + download mirror notes:
  https://undertaleyellow.fandom.com/wiki/Undertale_Yellow

## The tooling for `data.win`
- **UndertaleModTool (UMT)** — the authoritative decompile/recompile/inspect
  tool for GameMaker `data.win`. This is your #1 desktop tool:
  https://github.com/UnderminersTeam/UndertaleModTool
  The UnderminersTeam (the Undertale reverse-engineering crew) are the experts here:
  https://underminersteam.github.io/
- **WebUTMT (browser UMT)** — compile/decompile `data.win` in the browser; handy
  because it needs no .NET install:
  https://web.undermodtool.net/  (UMT project)
- Known issue confirming UTY's `data.win` is loadable-but-fiddly in UMT:
  https://github.com/UnderminersTeam/UndertaleModTool/issues/1693

## Runners / the ARM gap
- **Box86** (x86-32-on-ARM translator; the only "runner" that makes sense on
  your chip, but needs a 32-bit x86 Linux build):
  https://github.com/ptitSeb/Box86
  Compatibility list (Undertale-class games, what actually runs, what needs Box32):
  https://github.com/ptitSeb/box86-compatibility-list
- **gmrs** — community reimplementation of the GameMaker runner (Rust, portable;
  check the engine version gap against UTY's GMS2 format):
  https://github.com/vinx13/gmrs  (verify current repo)
- **PortMaster** — the pipeline that ships GameMaker games to ARM handhelds
  (arm64-only today, but the best reference for technique and per-game patches):
  https://portmaster.games/
  UTY is on their radar via suggestions: https://suggestions.portmaster.games/

## Handheld / Pi precedent (proof it's not crazy)
- Undertale-on-RaspberryPi thread that talks Box86 + the RPi-specific runner hack:
  https://forums.raspberrypi.com/viewtopic.php?t=130857
- Ancient-but-classic idea, still the right shape (run the data under a Pi/GMS player):
  https://forum.clockworkpi.com/t/undertale-on-clockworkpi/3425

## Community channels (go here with your inspect output)
- r/UndertaleYellow — the fangame's own subreddit
- r/Underminers — GameMaker `data.win` reverse engineering
- UndertaleModTool GitHub issues/Discord (per issue #1693 above)
- The UTY Discord (invite is linked on the GameJolt page) — the devs + the
  Android-port author are the ones who already ran `data.win` outside Windows.

## How to ask them effectively (so they help you fast)
Lead with your `inspect-data.win.py` output:
- engine family + exact version (from UMT),
- whether bytecode is 64-bit (UMT's bytecode64 flag),
- VM vs YYC.
Then the single question: *"Has anyone made/found a GMS2 `data.win` runner that
executes on 32-bit ARMv7 Linux (arm-linux-gnueabihf) — or can we shave the
Android arm64 build of UTY down to armv7?"* That is the whole ask.