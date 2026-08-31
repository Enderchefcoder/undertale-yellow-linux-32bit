#!/bin/sh
#
# serve.sh — serve a local HTML5/wasm UTY folder so a kiosk browser can load it.
# Binds to 127.0.0.1 by default (self-play). Use --addr 0.0.0.0 to let another
# machine on the LAN test it first (handy before copying to the console).
#
# Safe by default: reports the command it would run. Pass --run to actually serve.
# Usage:
#   sh serve.sh --dir /path/to/web-build [--port 8080] [--addr 127.0.0.1] [--run]
#
set -u

DIR=game
PORT=8080
ADDR=127.0.0.1
MODE=dry
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dir) shift; DIR="$1" ;;
    --port) shift; PORT="$1" ;;
    --addr) shift; ADDR="$1" ;;
    --run) MODE=run ;;
    *) echo "unknown: $1"; exit 2 ;;
  esac
  shift || true
done

[ -d "$DIR" ] || { echo "error: web build dir not found: $DIR (use --dir <path>)"; echo "   it should contain index.html and the .wasm/.js game files."; exit 2; }

SERVER=""
if command -v python3 >/dev/null 2>&1; then
  SERVER="python3 -m http.server $PORT --bind $ADDR"
elif command -v busybox >/dev/null 2>&1 && busybox --list 2>/dev/null | grep -q httpd; then
  SERVER="busybox httpd -f -p $PORT -h $DIR"
else
  echo "error: need python3 or busybox httpd to serve."; exit 2
fi

echo "== serve (dry run) =="
echo "dir  : $DIR"
echo "url  : http://$ADDR:$PORT"
echo "cmd  : $SERVER"
echo "test on a desktop browser first:  http://127.0.0.1:$PORT"

if [ "$MODE" = "run" ]; then
  echo "serving (Ctrl-C to stop)..."
  ( cd "$DIR" && $SERVER )
else
  echo "(dry-run — re-run with --run to actually serve.)"
fi