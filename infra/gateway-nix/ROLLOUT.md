# gateway-nix rollout

Tracking file for **#298** — gateway2's stack on NixOS. Exploratory; decisions
and reasons are in the ticket's 2026-09-24 comment.

**Timebox: 1h on 2026-09-24, 2h max on 2026-09-25.** At the limit, stop and
write the verdict with what exists. Worth it = provisioning experience plus a
comparison against 24.04.5 (~25–30s VM restart → NATS ready), whatever the
number is.

Host: VMM clone of gateway2, named `gateway-nix`. gateway2 stays shut down
for the whole experiment. Config: [flake.nix](flake.nix), one file,
`nixos-26.05`. Stack: `infra/gateway2/compose.yaml`, unchanged.

Better Stack is not paused; `health.qcic` alerts while gateway2 is off.

## 0 · Prepare

- [x] `flake.nix` written; evaluates on galois (NixOS 26.05, Docker 29.8.0)
- [x] Branch `agent/gateway-nix` pushed
- [x] System closure and disko script build on gauss; Docker ships compose 5.4.0 + buildx 0.31.1

## 1 · gateway2 → clone

- [x] gateway2 · `~/Code/iMetrical/im-qcic/infra/gateway2` · `just down` · Daniel
- [x] VMM · gateway2 · Shut down · Daniel
- [x] VMM · gateway2 · Clone → `gateway-nix` · Daniel
- [x] VMM · gateway-nix · Edit → Network: confirm MAC differs from gateway2
      (`02:11:32:2e:16:6a`), regenerate if not · Daniel
- [x] VMM · gateway-nix · Power on; note its DHCP address · Daniel
- [x] gateway-nix (Ubuntu) · `/etc/sudoers.d/daniel-nopasswd` ·
      `echo 'daniel ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/daniel-nopasswd` · Daniel

Done 2026-09-24. gateway2 set to **not autostart** in VMM, so a Synology
restart does not bring it up alongside the clone — set it back at close.
Clone MAC `02:11:32:2a:40:56` (VMM regenerates it; not shown in Edit), DHCP
`192.168.2.139`. That first lease took **8.5 min** (boot 05:05:19Z, lease
05:13:54Z) — the router, not the guest: networkd asked at boot. A reboot at
05:16Z got the same lease 2s after networkd started, so the delay is a
first-lease-for-a-new-MAC cost. Tailnet came up `Running` as `gateway2`.

The clone boots Ubuntu with gateway2's Tailscale key. Harmless while gateway2
is off; the install wipes it.

## 2 · Install 1 — `nixos-anywhere` over the Ubuntu clone

- [x] galois → gateway-nix · append gauss's public key to
      `~/.ssh/authorized_keys` · Daniel. Wiped by the install; the NixOS
      config does not carry it. (Agent forwarding was dropped: galois runs no
      ssh-agent.)
- [x] gauss · run, with `<ip>` from step 1 · Daniel

      nix run github:nix-community/nixos-anywhere -- \
        --flake 'github:daneroo/im-qcic/agent/gateway-nix?dir=infra/gateway-nix#gateway-nix' \
        --target-host daniel@<ip>

- [x] Record wall-clock install time — **4m57.5s** (2026-09-24 05:21–05:26Z):
      kexec 19s, disko, closure upload, GRUB, reboot. First NixOS boot:
      `0.87s kernel + 9.35s initrd + 34.9s userspace = 45.1s` (no stack yet).
      New DHCP lease **`192.168.2.92`** — dhcpcd's client-id differs from
      networkd's, so the router saw a new client. BIOS GRUB and
      `/boot/EFI/BOOT/BOOTX64.EFI` both installed.
- [x] gateway-nix · `sudo tailscale up` → open auth URL · Daniel — `100.108.116.17`,
      `ssh gateway-nix` works by MagicDNS. `--operator=daniel` set by hand.
- [x] gateway-nix · `git clone` im-qcic to `~/Code/iMetrical/im-qcic` · agent —
      public repo over HTTPS, no GitHub credentials on the host
- [x] galois → gateway-nix · scp the three `credentials/` files · agent — CF
      token from galois's `infra/gateway/credentials/caddy/CREDS.env`
- [x] Config changes applied in place with
      `sudo nixos-rebuild switch --flake github:…#gateway-nix` run **on the
      VM** (1m49s; no gauss needed): Tailscale `--operator=daniel`, `btop`
- [x] gateway-nix · `just build && just start` · agent — build **39m26s**
      (05:38:42 → 06:18:08Z, `EXIT=0`) against gateway2's ~11m30s. Cold host
      (no layer cache, every base image pulled), containerd snapshotter, btrfs
      zstd — not separated. Not a boot-timing number.
- [x] Verify serving **from worker logs**, not `docker ps` — 06:21Z: nats
      `Server is ready`; `ted1k-derive` published all three views;
      `scast-bridge` copying `darwin` and `scast-hilbert` generations (seq
      1339948); caddy obtained real LE certs via DNS-01; `/healthz` 200

## 3 · Samples — install 1

**Samples 1–4 are discarded** (Daniel, 2026-09-24): taken during the
Synology's monthly scrub, which multiplied fsync cost ~6×. Kept below for the
record only. Samples 5–6 were taken with the scrub paused and are the ones
comparable to C1 (~25–27s). Samples 5–8, scrub paused:

| method | Ubuntu 24.04 (C1) | NixOS, btrfs guest |
| ------ | ----------------- | ------------------ |
| VMM restart | +25.9s, +25.2s | +38s, +39s |
| VMM shut down + start | +26.7s, +25.4s | +32s |
| guest reboot | — | +31s |
| total boot (`systemd-analyze`) | 44–48s | 40.4–43.0s |

To kernel + systemd, NixOS is even or slightly faster. NATS ready is 5–13s
later, all of it in the Docker stage — consistent with guest btrfs's ~1.6–2×
fsync cost; install 2 on ext4 tests that. `ted1k-derive` came up dead on 3 of
4 paused boots: NixOS's container start order puts it ahead of NATS more often
(#297).

Same method and columns as gateway2 A5/C1: `systemd-analyze`,
`systemd-analyze blame | head -20`, `journalctl -b -k -o short-monotonic`,
container `StartedAt`, NATS "Server is ready", worker logs.

| #   | kernel | userspace | containers started | NATS ready | notes |
| --- | ------ | --------- | ------------------ | ---------- | ----- |
| 1   | 0.83s  | 3m09.2s   | +1:58 → +2:15      | **+3:00**  | VMM restart 06:46:13Z; initrd 7.0s; `docker.service` 2m51.7s — dockerd `Loading containers` 06:46:51→06:49:16 (2m25s); tailnet `Running` ~+22s; `ted1k-derive` dead (`connection refused`, #297). **Not a valid sample — see disk finding below.** |
| 2   | 0.88s  | 1m04.0s   | +46s → +54s        | **+68s**   | VMM restart 07:45:46Z, **Synology scrub running**; initrd 5.1s; `docker.service` 52.2s — `Loading containers` 46s; NATS start→ready 14s; tailnet `Running` +18s; `ted1k-derive` dead — first poll 0.8s before NATS ready (#297); both workers logged `RequestError: connection disconnected` stack traces on the previous shutdown (#297 shutdown side). |
| 3   | 0.85s  | 1m02.1s   | +44s → +54s        | **+63s**   | **VMM shut down + start**, scrub running; Start ~07:51:31Z → kernel 07:51:34Z (≤3s, click time approximate); initrd 4.6s; `docker.service` 49.9s — `Loading containers` 45s; tailnet `Running` +8s; both workers did real work (`ted1k-derive` published all three views, `scast-bridge` copied). |
| 4   | 0.92s  | 1m03.9s   | +43s → +57s        | **+62s**   | **guest `sudo systemctl reboot`** (extra, not in C1), scrub running; issued 07:56:09Z, journal stopped 07:56:28Z (shutdown 19s), boot 07:56:32Z; initrd 4.9s; `Loading containers` 48s; tailnet `Running` +17s; `ted1k-derive` published; **`scast-bridge` dead** — `duplicate subscription` (#297, prod-side durable consumer). |
| 5   | 0.82s  | 36.1s     | +25s → +31s        | **+31s**   | guest `sudo systemctl reboot`, **scrub paused**; issued 08:12:14Z, journal stopped 08:12:31Z (shutdown 17s), boot 08:12:35Z; total 40.8s; initrd 3.9s; `Loading containers` 25s; tailnet `Running` +10s; `ted1k-derive` published; **`scast-bridge` dead** (`duplicate subscription`, #297). **The one sample comparable to C1's ~26s.** |
| 6   | 0.82s  | 38.1s     | +28s → +33s        | **+38s**   | **VMM restart**, scrub paused; journal stopped 08:15:23Z, boot 08:15:27Z; total 43.0s; initrd 4.0s; `Loading containers` 26s; tailnet `Running` +16s; **`ted1k-derive` dead** — started 1.7s before NATS (#297); `scast-bridge` copied. |
| 7   | 0.81s  | 35.9s     | +27s → +32s        | **+39s**   | **VMM restart**, scrub paused; journal stopped 08:17:55Z, boot 08:17:59Z; total 40.4s; `Loading containers` 24s; tailnet `Running` +9s; **`ted1k-derive` dead** (`getaddrinfo ENOTFOUND`, started 4.7s before NATS). |
| 8   | 0.86s  | 36.3s     | +22s → +28s        | **+32s**   | **VMM shut down + start**, scrub paused; Start ~08:20:03–08:20:14Z → kernel 08:20:15Z; total 40.8s; `Loading containers` 24s; tailnet `Running` +11s; **`ted1k-derive` dead** (`connection refused`, started 2.9s before NATS). |

### Disk finding, 2026-09-24 ~07:00Z — stop sampling until explained

Synchronous 4 KiB writes (`dd bs=4k count=200 oflag=dsync`) on gateway-nix:

| target | time | per fsync |
| ------ | ---: | --------: |
| btrfs `/` (guest btrfs on Synology btrfs) | 220.4s | **1.1s** |
| vfat `/boot` (no CoW) | 79.3s | **0.4s** |

Repeated at 08:07–08:09Z with the scrub **paused** (DSM Storage Manager):

| target | time | per fsync |
| ------ | ---: | --------: |
| gateway-nix btrfs `/` | 35.4s | 177 ms |
| gateway-nix vfat `/boot` | 17.2s | 86 ms |
| production gateway ext4 `/` (Ubuntu, LVM) | 21.6s | 108 ms |

The LUN itself is ~100 ms per fsync for every guest, Ubuntu included. The
scrub multiplies that ~6×; guest btrfs adds ~1.6–2× on top.

The scrub explains the first table. The per-fsync cost under it fits every
slow thing seen here:
the 39m build, `journal-flush` 8.9s, dockerd's 2m25s `Loading containers`,
and container stops of 6–57s that all exited 0 but whose exit events dockerd
acted on ~10s late ("failed to exit within 10s… using the force" after
`shim disconnected`).

Stop timings, one by one after a fresh `just start` (all `exit=0`):
scast-bridge 9.96s · ted1k-derive 6.13s · health 6.14s · caddy 16.31s ·
nats 57.21s. So the slow-stop hand-off in section 6 is probably the disk, not
Bun's signal handling — re-test before filing it anywhere.

Next, before any sample:
- [x] Same `dd` on an ext4 guest, same Synology — done on production gateway
      (gateway2 was off); see the paused-scrub table above
- [x] The scrub is DSM's **regular monthly** schedule
      (`/usr/syno/etc/datascrubbing.conf`: `scheduleinterval=1`, anchor
      2022-01-24 05:00Z, `run_all_time`) — the 24th of every month at 05:00Z.
      Don't sample on the 24th.
- [x] Synology: check for background activity — **a scrub was running** during
      samples 1–4 and the first `dd` test (Daniel, 2026-09-24). Started 05:00Z;
      1.68 TiB after 2h54m (~170 MB/s, throttled while we loaded the
      system); paused 08:05–08:22Z; then 2.19 TiB at 3h09m — **~615 MB/s**
      unloaded (disks read ~114 MB/s each, md2 100% busy). ETA ~14:00Z
      09-24. Progress needs
      `sudo btrfs scrub status /volume1` on syno. Re-run `dd` on both hosts
      and resample after it finishes.
- [ ] Decide: keep btrfs in the guest, or ext4 (the LUN already sits on btrfs)

## 4 · Install 2 — ext4, second disk, from inside the running guest

The ISO rerun was dropped (2026-09-24): `nixos-anywhere` already proved the
reinstall path. What install 2 tests now is **ext4 vs guest btrfs** — only the
root filesystem changes (flake output `gateway-nix-ext4`; containerd
snapshotter unchanged). Installing from inside the guest onto a second disk
keeps Tailscale identity, credentials and images, and leaves the btrfs disk
as a one-click rollback. Run it after the scrub finishes.

- [x] VMM · gateway-nix · Shut down, snapshot, Start · Daniel — snapshot
      `nixos-btrfs-pre-ext4`, 2026-09-24 10:03Z, VM off ("File system consistent"), locked
- [x] VMM · gateway-nix · attach a second virtual disk (same size) · Daniel —
      200 GB. **The kernel renamed the disks**: new, empty disk became `sda`, the
      running btrfs disk `sdb`. Both layouts now pinned by id (commit `1105c7ee`).
- [x] gateway-nix · `ls -l /dev/disk/by-id/` → put the new disk's id into
      `ext4Disk` in `flake.nix`; push · agent — ext4 `scsi-360014055f88e136dd2fdd491fda50dd5`,
      btrfs `scsi-360014052636e7a6d7683d4f56d9193d2`
- [x] gateway-nix · `sudo nix run github:nix-community/disko -- --mode
      destroy,format,mount --flake <ref>#gateway-nix-ext4` → `/mnt` · agent —
      1m37s (scrub running); target checked empty first; `--yes-wipe-all-disks`
      needed non-interactively
- [ ] gateway-nix · `sudo nixos-install --flake <ref>#gateway-nix-ext4
      --root /mnt --no-root-passwd` · agent
- [ ] gateway-nix · stop docker; `rsync -aHAXS --numeric-ids` `/var/lib/tailscale`,
      `/var/lib/docker`, `/home/daniel` → `/mnt` · agent
- [ ] VMM · gateway-nix · Shut down; boot from the new disk; detach (don't
      delete) the btrfs disk · Daniel
- [ ] Verify: tailnet still `gateway-nix` at `100.108.116.17`, stack serving by
      worker logs; later rebuilds target `#gateway-nix-ext4`

## 5 · Samples — install 2 (ext4), scrub-free

| #   | kernel | userspace | containers started | NATS ready | notes |
| --- | ------ | --------- | ------------------ | ---------- | ----- |
| 4   |        |           |                    |            |       |
| 5   |        |           |                    |            |       |

## Tomorrow

- DNS names for gateway-nix (`imetrical.net`, `.com`, `.ts`). The Caddyfile
  serves only `gateway2*` names, so this touches stack config, which is out of
  bounds for the comparison. Decide first.

## 6 · Close

- [ ] Verdict on #298
- [ ] Hand-off for later tickets, in the verdict: **slow container stop.**
      `just down` on gateway2 took ~41s (caddy, health); gateway-nix's
      shutdown shows systemd's "a stop job is running". Likely Bun as PID 1
      without an init (`tini` / compose `init: true`) ignoring SIGTERM until
      Docker's kill timeout. Belongs with #297's signal/exit handling, not
      here — measure the shutdown time first.
- [ ] Remove `wheelNeedsPassword = false`, redeploy
- [ ] VMM · gateway-nix · Shut down; gateway2 · Autostart back on, Power on · Daniel
- [ ] gateway2 · `just start`; workers verified from logs · agent
- [ ] Samples onto the timeline page

## Known confounds

- GRUB timeout 1s vs Ubuntu's 0 — lands in the QEMU → kernel stage.
- Docker storage: containerd snapshotter (`overlayfs`, the fresh-install
  default on 29.x) vs gateway2's `overlay2` graph driver (upgraded install).
- `HOSTALIAS: gateway2` is hard-coded in `compose.yaml`, so health's byline
  reads `gateway2` on this host. Accepted: the compose file stays unchanged.

## NixOS install notes

Reusable findings go here as they land.

- **`nixos-anywhere` over a running Ubuntu** needs only SSH plus
  passwordless sudo for a user. The kexec installer restores the target's
  IPs and routes, so it comes back on the same address (19s here).
- **During the install the target is the kexec installer**, which authorizes
  only the key that launched it (as root). SSH as your user prompts for a
  password there. Don't enter one.
- **Expect a new DHCP lease on first boot** when moving from networkd
  (Ubuntu) to dhcpcd (NixOS default): the client-id changes even though the
  MAC does not.
- **A clone with a new MAC waited 8.5 min for its first lease** from the
  router. That was first-lease only: a reboot got it in 2s.
