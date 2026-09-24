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
- [ ] gateway-nix · `git clone` im-qcic to `~/Code/iMetrical/im-qcic` · agent
- [ ] galois → gateway-nix · scp the three `credentials/` files · Daniel
- [ ] gateway-nix · `just build && just start` · agent
- [ ] Verify serving **from worker logs**, not `docker ps`

## 3 · Samples — install 1 (3)

Same method and columns as gateway2 A5/C1: `systemd-analyze`,
`systemd-analyze blame | head -20`, `journalctl -b -k -o short-monotonic`,
container `StartedAt`, NATS "Server is ready", worker logs.

| #   | kernel | userspace | containers started | NATS ready | notes |
| --- | ------ | --------- | ------------------ | ---------- | ----- |
| 1   |        |           |                    |            |       |
| 2   |        |           |                    |            |       |
| 3   |        |           |                    |            |       |

## 4 · Install 2 — ISO, same flake

- [ ] VMM · gateway-nix · mount
      `nixos-graphical-26.05.4364.0ad6f47ea4fe-x86_64-linux.iso` on `sr0`,
      boot from it · Daniel
- [ ] Installer console · `passwd` (for nixos) and note IP · Daniel
- [ ] gauss · same `nixos-anywhere` command, `--target-host nixos@<ip>` · Daniel
- [ ] Tailscale admin · delete the old `gateway-nix` node, then
      `sudo tailscale up` · Daniel
- [ ] Credentials, build, start, verify — as in section 2
- [ ] Record wall-clock install time

## 5 · Samples — install 2 (2)

| #   | kernel | userspace | containers started | NATS ready | notes |
| --- | ------ | --------- | ------------------ | ---------- | ----- |
| 4   |        |           |                    |            |       |
| 5   |        |           |                    |            |       |

## 6 · Close

- [ ] Verdict on #298
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
