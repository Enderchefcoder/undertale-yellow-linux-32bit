#!/bin/sh
#
# detect.sh — discover what the target console/VM actually is, so we can pick
# the right route (native data.win runner vs WebAssembly vs Box86).
#
# Safe: read-only. Never installs or modifies anything.
#   sh detect.sh              -> report the current machine
#   sh detect.sh /some/dir    -> also check that dir for game files / runners
#
set -u

info() { printf '%s\n' "$1"; }
header() { printf '\n== %s ==\n' "$1"; }

header "Machine / kernel"
[ -f /etc/os-release ] && . /etc/os-release
info "OS      : ${PRETTY_NAME:-unknown}"
info "uname   : $(uname -srm)"
info "machine : $(uname -m)  (armv7l/armhf = 32-bit ARM; aarch64 = 64-bit ARM; x86_64 = 64-bit x86)"
case "$(uname -m)" in
  armv7l|armv6l) info "bitness : 32-bit ARM  -> native runner target" ;;
  aarch64)       info "bitness : 64-bit ARM  -> Box64 / PortMaster viable" ;;
  x86_64)        info "bitness : 64-bit x86  -> official UTY Linux build can run directly" ;;
  *)             info "bitness : unknown arch" ;;
esac

header "Memory / storage"
if command -v free >/dev/null 2>&1; then
  free -m | sed -n '1,2p'
else
  grep MemTotal /proc/meminfo 2>/dev/null || info "no /proc/meminfo"
fi
grep -E 'model name|Hardware|Processor' /proc/cpuinfo 2>/dev/null | head -4 || true

header "Display / session (needed for a kiosk browser or X11 game)"
info "DISPLAY         : ${DISPLAY:-<none>}"
info "WAYLAND_DISPLAY : ${WAYLAND_DISPLAY:-<none>}"
info "XDG_SESSION_TYPE: ${XDG_SESSION_TYPE:-<none>}"
for c in Xorg weston xinit startx sdldriver; do
  command -v "$c" >/dev/null 2>&1 && info "have            : $c"
done

header "Browsers / wasm-capable engines (for the WebAssembly route)"
found=0
for b in chromium chromium-browser google-chrome firefox firefox-esr epiphany surf wpewebkit; do
  if command -v "$b" >/dev/null 2>&1; then info "have : $b ($(command -v $b))"; found=1; fi
done
[ "$found" -eq 0 ] && info "none found -> will need: apt-get install chromium  (see port/wasm/install-browser.sh)"

header "Translators / runners (Box86 fallback)"
for t in box86 box64 wine; do
  command -v "$t" >/dev/null 2>&1 && info "have : $t" || true
done

header "Toolchain (for building Box86 or a runner)"
for t in cmake make gcc g++ git; do
  command -v "$t" >/dev/null 2>&1 && info "have : $t" || info "missing : $t"
done

# Optional: inspect a folder of game files.
if [ "${1:-}" != "" ]; then
  dir="$1"
  header "Game files in '$dir'"
  [ -d "$dir" ] || { info "(!) not a directory: $dir"; exit 0; }
  ls -la "$dir" 2>/dev/null | head -30
  if ls "$dir"/data.win >/dev/null 2>&1; then
    info "FOUND data.win  -> portable game present; engine info: python3 port/inspect-data.win.py $dir/data.win"
  fi
  for f in "$dir"/*.exe "$dir"/runner "$dir"/*.unx; do
    [ -f "$f" ] && { info "FOUND executable: $f"; file "$f" 2>/dev/null || true; }
  done
fi

info ""
info "Next step: run the port one-liner that matches your arch, or jump to the WebAssembly route in port/wasm/README.md"