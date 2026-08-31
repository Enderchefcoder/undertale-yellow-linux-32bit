#!/bin/sh
#
# extract-data.win.sh — pull the portable game data out of the official UTY zip.
#
# The full game (bytecode + all assets) lives in a single file, data.win. To run
# UTY on ANY non-Windows target you need that file. This only works with a zip
# YOU downloaded from the official GameJolt page:
#     https://gamejolt.com/games/UndertaleYellow/136925
#
# Safe by default (dry-run). Pass --extract to really unzip into ./work.
#
# Usage:
#   sh extract-data.win.sh /path/to/UndertaleYellow.zip          # dry run
#   sh extract-data.win.sh /path/to/UndertaleYellow.zip --extract
#
set -u

ZIP="${1:-}"
MODE="${2:-dry}"
[ -n "$ZIP" ] || { echo "error: give the path to the UTY .zip you downloaded."; echo "usage: $0 <UndertaleYellow.zip> [--extract]"; exit 2; }
[ -f "$ZIP" ] || { echo "error: file not found: $ZIP"; exit 2; }

command -v unzip >/dev/null 2>&1 || { echo "error: 'unzip' not installed (apt-get install unzip)"; exit 2; }
command -v file >/dev/null 2>&1 || HAVE_FILE=0 || HAVE_FILE=1
HAVE_FILE="${HAVE_FILE:-1}"

echo "== Scanning $ZIP =="
unzip -l "$ZIP" | head -40

# Decide which build inside the zip carries data.win. UTY ships Windows / Linux;
# both contain data.win, but the Linux build is 64-bit-x86 and the Windows build
# is 32-bit-x86 (Box86-incompatible for the Linux one). data.win itself is what
# matters for the WebAssembly / native-runner routes.
echo ""
echo "== Looking for the portable game file (data.win) =="
WIN=$(unzip -Z1 "$ZIP" 2>/dev/null | grep -i data.win | head -1)
echo "found: ${WIN:-<none>}"

if [ "$MODE" = "--extract" ]; then
  mkdir -p work
  echo "== Extracting into ./work (overwrites) =="
  unzip -o "$ZIP" -d work >/dev/null
  DW="work/$(dirname "$WIN")/data.win"
  [ -f "work/data.win" ] && DW=work/data.win
  if [ -f "$DW" ]; then
    echo "extracted data.win -> $DW"
    [ "$HAVE_FILE" -eq 1 ] && file "$DW"
    ls -la "$DW"
    echo "Next: python3 port/inspect-data.win.py \"$DW\""
  else
    echo "(!) data.win not found at expected path; check work/ manually."
  fi
else
  echo "(dry-run) re-run with --extract to unpack."
fi