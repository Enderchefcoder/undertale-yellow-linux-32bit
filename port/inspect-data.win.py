#!/usr/bin/env python3
"""
inspect-data.win.py — best-effort read of a GameMaker `data.win` header.

Purpose: quickly tell you *which* runner family a `data.win` belongs to
(engine, VM-vs-YYC, and any 64-bit bytecode hint) so you can pick a route.

IMPORTANT HONESTY:
  This is a *heuristic*. The authoritative reading (exact engine version and the
  bytecode64 flag) must come from UndertaleModTool (UMT):
      https://github.com/UnderminersTeam/UndertaleModTool
  UTY's data.win is known to be "loadable-but-fiddly" there; that's fine.
  Treat anything printed here as a directional signal, then confirm in UMT.

Usage:
  python3 inspect-data.win.py data.win [--scan]
    --scan   also print every structural tag offset found (diagnostic)
"""
import sys, struct

def tags_in(data, limit=1_000_000):
    frames = []
    for tag in (b"FUN\x20", b"FUN\x00", b"STRG\x20", b"FORM\x20", b"HEAD\x20", b"CODE"):
        start = 0
        while True:
            i = data.find(tag, start, limit)
            if i < 0:
                break
            frames.append((tag, i))
            start = i + 1
    frames.sort(key=lambda x: x[1])
    return frames

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    path = sys.argv[1]
    scan = "--scan" in sys.argv

    with open(path, "rb") as f:
        data = f.read(2_000_000)

    if not data.startswith(b"GM"):
        print("(!) This does not look like a GameMaker data.win (missing 'GM' magic).")
        sys.exit(0)
    print(f"file       : {path}")
    print(f"size       : {len(data):,} bytes (of file; we read first bytes)")
    print("magic      : GM (GameMaker)")
    print("endian     : little (standard for GameMaker)")

    frames = tags_in(data)
    funs = [o for t, o in frames if t.startswith(b"FUN")]
    fun = funs[0] if funs else None
    print(f"FUN tags   : {funs}")

    if fun is None:
        print("(!) no 'FUN' header located; open in UMT for a real read.")
        sys.exit(0)

    # Version header lives at the FUN chunk. Interpret both common layouts with
    # clear flags; the reliable answer is UMT's.
    base = fun
    endian = data[base:base+4]
    version = data[base+4:base+8]
    build = data[base+8:base+16].split(b"\x00", 1)[0]
    print(f"-- FUN header @0x{base:x} --")
    print(f"endian flag: {int.from_bytes(endian, 'little')}   (0=LE typical)")
    print(f"version int: {int.from_bytes(version, 'little')}")
    try:
        print(f"build      : {build.decode('ascii') or '??'}")
    except Exception:
        print(f"build      : (raw) {build!r}")
    # Bytecode info block: for GMS2 it sits ~0x30 into the header.
    bci = base + 0x30
    flags = int.from_bytes(data[bci:bci+4], "little")
    cksum32 = int.from_bytes(data[bci+4:bci+8], "little")
    cksum64 = int.from_bytes(data[bci+8:bci+12], "little")
    print(f"bytecode flags @0x{bci:x}: {flags:#x}   (bit1 set ~ 64-bit bytecode in some GMS2 builds)")
    print(f"checksum 32-bit : {cksum32:#x}")
    print(f"checksum 64-bit : {cksum64:#x}")

    print("")
    print("HEURISTIC TAKE (confirm in UMT):")
    ver = int.from_bytes(version, "little")
    if ver >= 2000:
        print("  -> looks like GMS2-generation format (>= v2000).")
        print("     gmrs (GMS1.4-era) will NOT load this without work.")
    elif ver > 14:
        print("  -> looks like GMS1-generation format.")
    else:
        print("  -> low version number; very old or odd; verify in UMT.")
    if flags & 0b10:
        print("  -> bytecode64 bit set: 64-bit bytecode. (Native armv7 runner harder.)")
    print("Authoritative: open this file in UndertaleModTool and read the exact")
    print("engine version + 'bytecode64' flag; that number drives which runner fits.")

if sys.argv[0].endswith("inspect-data.win.py") and __name__ == "__main__":
    import sys
    main()