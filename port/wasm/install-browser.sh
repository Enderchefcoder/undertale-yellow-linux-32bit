#!/bin/sh
#
# install-browser.sh — get a wasm-capable browser onto an armhf (Debian) device.
#
# The WebAssembly route needs a browser that JITs wasm (any Chromium or
# Firefox-ESR does). The GameShell/ClockworkOS is Debian-based, so apt applies.
# Probe-first: if a usable browser already exists it stops immediately.
#
# Safe by default (dry-run). Pass --install to actually apt-get.
# Usage:
#   sh install-browser.sh [--install]
#
set -u

MODE=dry
[ "${1:-}" = "--install" ] && MODE=install

HAVE=0
for b in chromium chromium-browser firefox firefox-esr epiphany surf; do
  command -v "$b" >/dev/null 2>&1 && { echo "have browser: $b"; HAVE=1; }
done
if [ "$HAVE" -eq 1 ]; then
  echo "A browser is already present — nothing to do. (Use port/wasm/kiosk.sh.)"
  exit 0
fi

echo "== browser install (plan) =="
echo "distro : $( ( . /etc/os-release && echo "${PRETTY_NAME:-unknown}" ) 2>/dev/null || echo unknown )"
echo "arch   : $(uname -m)"
echo "plan   : apt-get update && apt-get install -y chromium  (try chromium-browser / firefox-esr if chromium unavailable)"
echo "reason : need a wasm-capable engine to run the UTY web build natively on ARM"

if [ "$MODE" = "install" ]; then
  command -v apt-get >/dev/null 2>&1 || { echo "error: no apt-get on this system; install a Chromium/Firefox armhf package manually."; exit 2; }
  set -e
  sudo apt-get update
  if apt-cache show chromium >/dev/null 2>&1; then
    sudo apt-get install -y chromium
  elif apt-cache show chromium-browser >/dev/null 2>&1; then
    sudo apt-get install -y chromium-browser
  else
    sudo apt-get install -y firefox-esr
  fi
  echo "done. run port/wasm/kiosk.sh to launch."
else
  echo "(dry-run — re-run with --install to actually install.)"
fi