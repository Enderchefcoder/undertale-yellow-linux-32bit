# R16 harness — an armv7 sandbox that simulates your console

This is a qemu machine that boots a **32-bit ARM (armhf) Debian** guest on a
**Cortex-A7** CPU profile — the same architecture as your Allwinner R16. Its job
is to be the test bed the UTY port runs in once an ARMv7 GMS2 `data.win` runner
exists.

> Honest status: the harness **boots the right architecture**, but it runs
> **empty** — it will not launch Undertale Yellow until the missing
> `arm-linux-gnueabihf` GMS2 runner is produced. It exists so that "when we get
> a runner, we have a place to run it and screenshot proof is genuinely
> possible." Nothing here fakes that.

## Requirements

Run this on a machine that has qemu-system-arm (the *build* prep happens on a
normal PC; the guest boot needs qemu):
- Debian/Ubuntu: `sudo apt-get install qemu-system-arm qemu-utils`
- A 32-bit ARM root filesystem. Two ways:
  - **Easiest:** debootstrap an armhf rootfs on a PC:
    ```
    sudo debootstrap --arch=armhf bookworm rootfs http://deb.debian.org/debian/
    ```
  - Or use a prebuilt armhf image (Raspberry Pi OS armhf root, PocketCHIP's
    Debian image, etc.) and point `BOOT_*` at its kernel/filesystem.

## Files

- `boot-r16.sh`  — boot a Cortex-A7 armhf Debian guest under qemu-system-arm
- `install-toolkit-on-guest.sh` — copy `port/` + a `data.win` into the guest
- `run-game.sh` — invoke a GMS2 runner for `data.win` **inside the guest** (fails
  loudly if no runner is present, so you always know the true state)

## Workflow

```
# 1. (on a PC) pre-mount the rootfs and install the toolkit into it:
sh install-toolkit-on-guest.sh --root /path/to/rootfs

# 2. boot the emulated R16 (any machine w/ qemu-system-arm):
sh boot-r16.sh

# 3. inside the guest, once a runner is available:
sh run-game.sh data.win --runner /path/to/gms2-runner.armv7
```

Run any of these with no `--root`/`--runner` to get a dry-run of exactly what
they'd do — nothing destructive by default.