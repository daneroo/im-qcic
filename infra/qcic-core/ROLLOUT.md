# qcic-core rollout (was: gateway-nix, #298)

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

After install 2, 10:22Z, scrub paused: **gateway-nix ext4 11.8s (59 ms per
fsync)** against production ext4 26.2s (131 ms). Guest ext4 is ~3× guest
btrfs on the same host; the fresh LUN is ~2× production's four-year-old LUN
(11 snapshots) at the same filesystem — the "LUN lineage" C0 flagged.

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
- [x] gateway-nix · `sudo nixos-install --flake <ref>#gateway-nix-ext4
      --root /mnt --no-root-passwd` · agent — 2m35s; GRUB i386-pc on the new
      disk by id plus x86_64-efi `BOOTX64.EFI`
- [x] gateway-nix · stop docker; `rsync -aHAXS --numeric-ids` `/var/lib/tailscale`,
      `/var/lib/docker`, `/home/daniel` → `/mnt` · agent — docker + tailscaled
      stopped (14s; over LAN `.92`, since stopping tailscaled drops MagicDNS);
      rsync 101s (docker 3.4G, home 84M incl. repo + credentials, tailscale
      state); `/mnt` unmounted. rsync isn't in the system — `nix shell
      nixpkgs/nixos-26.05#rsync` was enough
- [x] VMM · gateway-nix · Shut down; **Reorder** so the ext4 disk is first;
      btrfs disk kept attached as rollback (partlabels differ, no collision) ·
      Daniel — VMM warns "may not recognize the volume"; harmless here
- [x] **SSH host keys were not carried** — `/etc/ssh/ssh_host_*` is state too;
      the new root generated fresh keys and galois warned. Fixed by mounting the
      btrfs `@` subvolume read-only and copying the old keys back
- [x] Verify: tailnet still `gateway-nix` at `100.108.116.17` (no re-auth),
      same SSH host keys, stack serving: `ted1k-derive` published;
      `scast-bridge` dead (`duplicate subscription`, #297) → restarted.
      Later rebuilds target `#gateway-nix-ext4`

First ext4 boot (10:17:32Z, VMM start, **scrub still running**): total
**25.1s** (0.85s kernel + 5.1s initrd + 19.2s userspace); `Loading
containers` 8s; all five containers +18s; **NATS ready +23s**; tailnet
`Running` +16s. Faster than Ubuntu on an idle Synology (~26s): guest btrfs
was the whole gap.

## 5 · Samples — install 2 (ext4), scrub-free

| #   | kernel | userspace | containers started | NATS ready | notes |
| --- | ------ | --------- | ------------------ | ---------- | ----- |
| E1  | 0.98s  | 15.2s     | +17s               | **+18s**   | guest `sudo systemctl reboot`, scrub paused; issued 10:23:30Z, journal stopped 10:23:34Z (**shutdown 4s**), boot 10:23:39Z; total 20.1s; `Loading containers` 4s; tailnet +10s; both workers did real work |
| E2  | 0.85s  | 15.8s     | +18s               | **+19s**   | guest reboot 55s after E1; shutdown 12s; total 20.4s; tailnet +17s; `ted1k-derive` published; **`scast-bridge` dead** (`duplicate subscription` — prod still held E1's consumer, #297) → restarted |
| E3  | 0.84s  | 14.9s     | +17s               | **+18s**   | **VMM restart**, scrub paused; boot 10:29:59Z; total 19.6s; tailnet +10s; `ted1k-derive` published; `scast-bridge` started clean |
| E4  | 0.88s  | 24.3s     | +27s               | **+33s**   | **VMM restart**; boot 10:31:33Z; total 34.1s, initrd **8.9s** (vs ~4s) — host-side: scrub not running, but md2 93% busy on ~6 MB/s of small random I/O from something else on the Synology; tailnet +22s; **`ted1k-derive` dead** (`connection refused`) → restarted; `scast-bridge` copied |
| E5  | 0.84s  | 22.5s     | +21s               | **+22s**   | **VMM shut down + start**; Start ~10:35:40Z → kernel 10:35:44Z (~4s); total 30.7s, initrd 7.4s; tailnet +11s; `ted1k-derive` published; **`scast-bridge` dead** (`duplicate subscription`) although the VM was off 99s (journal stopped 10:34:05Z) — prod holds the stale consumer longer than that (#297) |

ext4 fsync, scrub paused: 11.8s for 200 × 4 KiB (59 ms) against 35.4s on
btrfs. Container stops no longer hang shutdown (4–12s against 17–19s+).

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

## 7 · Close-out — consolidate into `infra/qcic-core` (decided 2026-09-25)

Decisions: gateway2 is retired as a direction; the stack and its NixOS
recipe move together into one component directory, **`infra/qcic-core`**
(the role — may run on several hosts later). The VM is renamed
**`qcic-syno`** (`<role>-<where it runs>`, like `scast-hilbert`). Per-host
values come from the flake via `/etc/qcic-core/host.env`: `HOST_NAME` for
Caddy's host-scoped site, `HOSTALIAS` for containers only (its original
purpose). Secrets stay as they are — agenix/sops is later, elsewhere.

Repo (agent):
- [x] `git mv` `infra/gateway2/*` + `infra/gateway-nix/*` → `infra/qcic-core/`;
      gateway2's ROLLOUT kept as `ROLLOUT-gateway2.md` (history)
- [x] compose: `name: qcic-core`; `HOSTALIAS: ${HOSTALIAS:?…}`; caddy gets
      `HOST_NAME: ${HOST_NAME:?…}`; header updated
- [x] Caddyfile: `{$HOST_NAME}.imetrical.net, {$HOST_NAME}.ts.imetrical.net`
- [x] Justfile: `export COMPOSE_ENV_FILES := "/etc/qcic-core/host.env"` —
      compose refuses to start without it (verified: `required variable
      HOSTALIAS is missing a value`)
- [x] flake: machine `qcic-syno` (ext4 only — the btrfs output is dropped;
      it lives in git history), `networking.hostName = "qcic-syno"`,
      `environment.etc."qcic-core/host.env"` derived from the hostname
- [x] Fix references: research doc, timeline page, `v2/infra/compose.yaml`
      sync rule, `CONTEXT-MAP.md` (plus Hardy: G. H. Hardy, not Hardy Heron)

Host — **reprovision from scratch** (decided 2026-09-25): a new VMM VM,
NixOS ISO, `nixos-anywhere`, following `README.md` step by step and fixing
the README wherever reality differs. Nothing carried from gateway-nix, which
stays shut down but intact until qcic-syno is verified, then is deleted.
- [x] `README.md` runbook written; credentials staged in galois's
      gitignored `infra/qcic-core/credentials/`
- [x] gateway-nix: `docker compose down` (4.9s on ext4), powered off
      2026-09-24 ~22:15Z. Production's `scast-bridge` consumer then showed
      `push_bound=false` — a clean `down` releases it; only reboots leave it
      bound (#297). gateway2 off since 2026-09-24 ~04:30Z, autostart off
- [ ] VMM · gateway-nix · autostart off · Daniel
- [x] README steps 1–16 on a new VM `qcic-syno` — progress 2026-09-24/25:
  - [x] 1–3 VM created: Q35, UEFI, 4 vCPU, 4 GB, 200 GB, Above normal,
        autostart. VMM fixes firmware at creation
  - [x] 4 installer: the graphical ISO's display froze under UEFI at the
        Plymouth handover; booted fine behind it (found by MAC at `.143`).
        Fixed with GRUB → Options → **No modesetting**; `passwd` in GNOME
  - [x] 5 keys: `nixos-anywhere` targets **root** — looped on `1 key(s)
        remain` against `nixos@` (48 tries), and `--env-password` also
        targets root. Copying the keys to `/root/.ssh` fixed it
  - [x] 6 disk `scsi-36001405b15d7a6ed5715d4107da118d9` pinned (`f67c489a`)
  - [x] 7 install: upload 945 MiB peaking 557 Mbps; GRUB i386-pc + x86_64-efi
  - [x] 8 ISO unmounted (VM off). Installed system boots **UEFI**, ext4;
        first clean boot 18.2s total with no stack; VMM provides a vTPM
        (no wait on `/dev/tpm0`). **TRIM is not passed through**
        (`DISC-MAX 0B`) — thin LUN won't reclaim; for #292
  - [x] 9 new lease `192.168.2.131`
  - [x] 10 tailnet `qcic-syno` `100.74.109.15`
  - [x] 11–12 branch cloned; credentials placed; `host.env` from the flake;
        `just compose config` passes
  - [x] 13 `just build` **3m22s** (00:59:10 → 01:02:32Z, scrub paused) —
        against 39m on btrfs during the scrub and 11m30s on gateway2's Ubuntu
  - [x] 14 gateway-nix and gateway2 off; prod consumer unbound
  - [x] VMM console froze before the login prompt (UEFI + VMware SVGA II:
        `vmwgfx` takes over from `simpledrm`). Fixed with
        `boot.kernelParams = [ "nomodeset" ]` (`b1df58d6`); confirmed by Daniel
  - [x] 15–16 `just start` 01:02Z; verified by worker logs: NATS ready;
        `ted1k-derive` published all three views; `scast-bridge` copied (86,
        catching up since 22:15Z); caddy certs for `qcic-syno{,.ts}.imetrical.net`
        (`HOST_NAME` from the flake) and `health.qcic{,.ts}`; `/healthz` 200
        with `"observer":"qcic-syno"` (`HOSTALIAS` from the flake)
- [x] Samples on qcic-syno (the final numbers for the verdict) — Q35, UEFI,
      ext4, `nomodeset`; A5/C1 method; 2026-09-25:

      | #  | method            | Synology        | total boot | NATS ready | tailnet | workers |
      | -- | ----------------- | --------------- | ---------- | ---------- | ------- | ------- |
      | Q1 | guest reboot      | quiet           | 23.7s      | **+23s**   | +12s    | scast dead (`duplicate subscription`, #297) |
      | Q2 | VMM restart       | quiet           | 20.1s      | **+19s**   | +10s    | both ok |
      | Q3 | VMM restart       | quiet           | 20.7s      | **+20s**   | +17s    | both ok |
      | Q4 | shut down + start | quiet           | 22.4s      | **+21s**   | +8s     | both ok; Start → kernel ~6s (UEFI) |

      Reproduces gateway-nix's ext4 result: **+19–23s against Ubuntu's
      +25–27s**. A guest reboot is a little slower than a VMM restart here:
      Docker waits for `nss-lookup.target` (~14s, behind DHCP).
- [x] Deleted in VMM (Daniel, 2026-09-25): **gateway-nix** and **gateway2**,
      each with its disks and all snapshots. gateway2 is retired
- [x] DNS (Daniel, 2026-09-25): removed `gateway2{,.ts}` on both Hover and
      Cloudflare; added `qcic-syno.imetrical.net` A `192.168.2.131` and
      `qcic-syno.ts.imetrical.net` A `100.74.109.15`; `health.qcic{,.ts}`
      changed from A records to **CNAMEs** to `qcic-syno{,.ts}` — service
      names point at the host name, so a host move is one CNAME
- [x] Production proxy: `infra/gateway` Caddyfile `health.qcic.dl` upstream
      `gateway2.imetrical.net:80` → **`health.qcic.imetrical.net:80`** (the
      service name). Direct commit on main `44ab0aa9`; pulled on gateway;
      `caddy validate` on `qcic-caddy:latest` → valid; `up -d
      --force-recreate caddy` (8s). Public `/healthz` 502 → 200,
      observer `qcic-syno`; audiobook 200
- [ ] DHCP reservation for `.131` — the router's reservation UI is broken
      ("already in use" by qcic-syno itself); lease is 3 days and survives
      reboots. Moving DHCP to UniFi is #292's
- [x] Tailscale: gateway-nix and gateway2 nodes removed; key expiry disabled
      on qcic-syno (Daniel, 2026-09-25). gateway2 would need a fresh
      `tailscale up` if ever started again

Close (Daniel reviews each):
- [ ] Docs: one consolidated ROLLOUT, research takeaway, timeline page
- [ ] #298 verdict comment
- [ ] #292 harvest comment (settled / open / remaining / out of scope)
- [ ] PR → main; close #298

## Known confounds

- GRUB timeout 1s vs Ubuntu's 0 — lands in the QEMU → kernel stage.
- Docker storage: containerd snapshotter (`overlayfs`, the fresh-install
  default on 29.x) vs gateway2's `overlay2` graph driver (upgraded install).
- `HOSTALIAS: gateway2` is hard-coded in `compose.yaml`, so health's byline
  reads `gateway2` on this host. Accepted: the compose file stays unchanged.

## Prospects — considerations for the conclusion, not measured here

Raised 2026-09-24 after the ext4 result. Stated from documentation and
general knowledge; none of it was measured in this experiment.

**Why btrfs doubled boot time.** Boot writes little data but issues many
fsyncs — Docker rewrites each container's state files, containerd's metadata
database fsyncs every transaction, journald flushes. That makes boot
latency-bound: ~100 fsyncs × 177 ms (guest btrfs) ≈ 18s, × 59 ms (guest ext4)
≈ 6s, matching `Loading containers` 24–26s vs 4–8s. Guest btrfs costs more
per fsync because a copy-on-write commit rewrites several scattered metadata
blocks (checksum and extent trees, log tree), and each lands on the Synology's
own btrfs as another copy-on-write write — the layers multiply.

**Keeping btrfs snapshots (e.g. for borg) without that cost** — options:
ext4 root plus a separate btrfs data disk for the datasets to back up;
btrfs with `nodatacow` on the hot paths (`/var/lib/docker`, JetStream data);
ext4 on LVM thin with LVM snapshots; or Synology-level snapshots only.

**A native NixOS hypervisor with Incus system containers** (e.g. on gauss):

- **Subvolumes pass in like bind mounts.** On a btrfs pool each container's
  root is a host subvolume; custom volumes attach into containers; host-side
  snapshots per volume.
- **No nesting.** A system container shares the host kernel and filesystem —
  no guest filesystem, no disk image — so writes hit the host's btrfs once.
  One copy-on-write layer instead of two. Incus *VMs* would reintroduce the
  nesting.
- **Own network stack.** Each container has its own network namespace and can
  sit on the LAN via bridge or macvlan. Tailscale runs inside, unprivileged,
  given `/dev/net/tun` (`incus config device add <ctr> tun unix-char
  path=/dev/net/tun`) — no Docker `--privileged` / `NET_ADMIN` / host-network
  workarounds. Full systemd init; NixOS images exist. Cost: a shared kernel
  (modules like `tun` and `nf_tables` must be on the host).
- **NVMe changes the arithmetic.** The limit here is fsync latency: 59 ms at
  best on this Synology's spinning RAID5 behind a virtual disk. Consumer NVMe
  is ~0.5–2 ms per fsync; enterprise NVMe with power-loss protection well
  under 0.1 ms — 30× to 500×+. Boot's disk term drops to milliseconds, and the
  small-database workloads here (containerd metadata, JetStream, SQLite)
  gain the most.

Next measurement if pursued: the same 200 × 4 KiB `dd oflag=dsync` on gauss
(NVMe, btrfs mirror).

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
