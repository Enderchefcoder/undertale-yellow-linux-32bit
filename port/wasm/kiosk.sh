#!/bin/sh
#
# kiosk.sh — open the UTY web build fullscreen in the best available browser.
#
# Requires a running display server (X11 or Wayland). It probes for one and, if
# it finds neither, says exactly what's missing instead of silently failing.
#
# Safe by default: prints exactly what it would run; serves nothing; opens
# nothing. Pass --run to actually launch.
# Usage:
#   sh kiosk.sh [--url http://127.0.0.1:8080] [--run]
#
set -u

URL="http://127.0.0.1:8080"
MODE=dry
while [ "$#" -gt 0 ]; do
  case "$1" in
    --url) shift; URL="${1:-}" ;;
    --run) MODE=run ;;
    *) echo "unknown: $1"; exit 2 ;;
  esac
  shift || true
done

# --- choose browser -------------------------------------------------------
BROWSER=""
for b in chromium-browser chromium google-chrome firefox firefox-esr surf epiphany; do
  if command -v "$b" >/dev/null 2>&1; then BROWSER="$b"; break; fi
done
if [ -z "$BROWSER" ]; then
  echo "error: no browser found. Run:  sh port/wasm/install-browser.sh --install"
  exit 2
fi

# --- display server? ------------------------------------------------------
DISP=
if [ -n "${DISPLAY:-}" ] || ls /tmp/.X11-unix/X* >/dev/null 2>&1; then
  DISP=x11
elif [ -n "${WAYLAND_DISPLAY:-}" ] && [ -e "${XDG_RUNTIME_DIR:-/run/user/0}/${WAYLAND_DISPLAY}" ]; then
  DISP=wayland
fi

echo "== kiosk (dry run) =="
echo "browser   : $BROWSER"
echo "url       : $URL"
echo "display   : ${DISP:-<none>}"

if [ "$MODE" = "run" ]; then
  if [ -z "$DISP" ]; then
    echo "error: no display server detected (DISPLAY/Wayland empty)."
    echo "  Stock ClockworkOS has a graphical session; start it, or run under:"
    echo "    weston --tty=1  (then re-run kiosk.sh --run)"
    echo "  via SSH remember to launch where the console's screen is, e.g."
    echo "    DISPLAY=:0 sh port/wasm/kiosk.sh --run"
    exit 3
  fi
  case "$BROWSER" in
    chromium*|google-chrome)
      exec "$BROWSER" --kiosk --no-sandbox --disable-infobars --window-size=320,240 --force-device-scale-factor=1 "$URL" ;;
    firefox*)
      exec "$BROWSER" --kiosk "$URL" ;;
    surf)
      exec "$BROWSER" -s "$URL" ;;
  esac
  # fallthrough if a browser matches none of the above
  exec "$BROWSER" "$URL"
else
  echo "(dry-run — Ctrl-C-safe. Re-run with --run to launch fullscreen.)"
fi