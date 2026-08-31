#!/bin/sh
#
# install-box86.sh — build Box86 (x86->ARM translator) for an ARM host.
#
# Context: Box86 runs *32-bit x86* Linux programs on ARM (it supports ARMv7/32-bit,
# its original home turf). It is ONLY useful here if a 32-bit x86 Linux build of
# Undertale Yellow ever exists (there is none officially). It will NOT run UTY's
# 64-bit x86_64 Linux build, and its sibling Box64 needs a 64-bit ARM host (you
# don't have one, if detect.sh reports armv7l). So: build this for the fallback,
# and lean on port/wasm/ for the near-lossless route.
#
# Safe by default: prints the full dry-run of what it would do. Pass --install.
# Usage:
#   sh install-box86.sh [--install] [--prefix /usr/local] [--jobs N]
#
set -u

MODE=dry
PREFIX=/usr/local
JOBS=1
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install) MODE=install ;;
    --prefix) shift; PREFIX="$1" ;;
    --jobs) shift; JOBS="$1" ;;
    *) echo "unknown: $1"; exit 2 ;;
  esac
  shift
done

ARCH="$(uname -m)"
case "$ARCH" in
  armv7l|armv6l) TARGET="armv7 (32-bit ARM) — BOX86 OK" ;;
  aarch64)       TARGET="aarch64 (64-bit ARM) — BOX86 OK (and consider Box64 too)" ;;
  *) TARGET="$(uname -m) — not obviously an ARM host; Box86 likely wrong here" ;;
esac

echo "== Box86 install (dry of what would run) =="
echo "host arch : $ARCH"
echo "target    : $TARGET"
echo "prefix    : $PREFIX"
echo "git repo  : https://github.com/ptitSeb/box86"
echo "build dir : /tmp/box86-build (cloned only with --install)"
echo "cmake args: -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_INSTALL_PREFIX=$PREFIX"
echo "notes     :"
echo "  - needs git, cmake, build-essential on the device"
echo "  - 32-bit ARM hosts build box86 natively (this is its supported case)"
echo ""
echo "RENDER OF ACTUAL COMMANDS (--install runs exactly these):"
cat <<CMD
  git clone --depth 1 https://github.com/ptitSeb/box86 /tmp/box86-build
  cd /tmp/box86-build
  mkdir -p build && cd build
  cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_INSTALL_PREFIX=$PREFIX
  make -j$JOBS
  sudo make install
CMD

if [ "$MODE" = "install" ]; then
  for c in git cmake make gcc; do
    command -v "$c" >/dev/null 2>&1 || { echo "error: missing '$c'. apt-get install $c"; exit 2; }
  done
  [ -e /tmp/box86-build ] && rm -rf /tmp/box86-build
  set -e
  git clone --depth 1 https://github.com/ptitSeb/box86 /tmp/box86-build
  cd /tmp/box86-build
  mkdir -p build && cd build
  cmake .. -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_INSTALL_PREFIX="$PREFIX"
  make -j"$JOBS"
  sudo make install
  echo "Installed. Use with: box86 <32-bit-x86-linux-binary>"
  echo "(Remember: Box86 only helps if a 32-bit x86 Linux UTY build exists.)"
else
  echo "(dry-run — re-run with --install to actually build.)"
fi