# qcic-core

The QCIC v2 stack — NATS, health, ted1k-derive, scast-bridge — plus Caddy,
together with the NixOS recipe for the machines that run it.

| file                  | what                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `flake.nix`           | NixOS host config; one `nixosConfigurations` entry per host (today: `qcic-syno`)  |
| `compose.yaml`        | the stack; a copy of `v2/infra/compose.yaml` plus Caddy (sync rule in its header) |
| `config/`             | Caddyfile, nats-server.conf                                                       |
| `Justfile`            | `just build`, `just start`, `just logs`, …                                        |
| `credentials/`        | gitignored; placed by hand (see below)                                            |
| `data/`               | gitignored; NATS JetStream and Caddy certs, bind-mounted                          |
| `ROLLOUT.md`          | how this came to be (#298), with measurements                                     |
| `ROLLOUT-gateway2.md` | the Ubuntu predecessor's history (#292–#296)                                      |

**Host naming.** `<role>-<where it runs>`, like `scast-hilbert`: `qcic-syno`
is the qcic-core host on the Synology. A second host is a second
`nixosConfigurations` entry.

**Per-host values.** The flake writes `/etc/qcic-core/host.env` from the
hostname: `HOST_NAME` (Caddy's host-scoped site, `<host>.imetrical.net`) and
`HOSTALIAS` (containers only). The Justfile passes it to compose; compose
refuses to start without it.

## Provision a new host

A fresh Synology VMM VM, installed from a NixOS ISO with `nixos-anywhere`.
Nothing is carried over from any other machine.

Each step: **machine · file/place · action · who.**

### 1 · Create the VM

1. **galois → Syno** · VMM → Image → ISO · upload a NixOS installer ISO
   (any recent one; the graphical ISO works — only its SSH is used) · Daniel
2. **Syno** · VMM → Create → Linux · name `qcic-syno`; 4 vCPU; 4 GB RAM;
   one 200 GB disk; same network as the other VMs; ISO in the CD drive;
   machine type **Q35**; firmware **UEFI** · Daniel. Q35 is the modern
   chipset (native PCIe), the usual pairing with UEFI and what Proxmox
   recommends; PC (i440FX) and Legacy BIOS also work — the disk layout boots
   both, and gateway2 / gateway-nix ran PC + BIOS.
3. **Syno** · VMM · Start · Daniel

### 2 · Reach the installer

4. **VM console** · a terminal in the installer · `passwd` (twice), then
   `ip -br a` for the address. If SSH does not answer later:
   `sudo systemctl start sshd` · Daniel
5. **gauss** · `ssh-copy-id nixos@<ip>` (the password from step 4) · Daniel
6. **gauss** · `ssh nixos@<ip> ls -l /dev/disk/by-id/` · the new disk's
   `scsi-…` id (no `-part` suffix) → `ext4Disk` in `flake.nix`; commit, push · agent

A custom installer ISO with the operator's key built in skips steps 4–5.

### 3 · Install

7. **gauss** · install onto the disk, from the pushed branch · Daniel

   ```sh
   nix run github:nix-community/nixos-anywhere -- \
     --phases disko,install,reboot \
     --flake 'github:daneroo/im-qcic/<branch>?dir=infra/qcic-core#qcic-syno' \
     --target-host nixos@<ip>
   ```

   The target is already a NixOS installer, so the `kexec` phase is skipped.
   Wipes the disk named in `ext4Disk`.

8. **Syno** · VMM · eject the ISO so the next boot is from disk · Daniel
9. **galois** · `ssh daniel@<new ip>` · the installed system takes a **new
   DHCP lease** (different client id from the installer); find it in VMM
   (the guest agent reports it) or on the console · Daniel

### 4 · First boot

10. **qcic-syno** · `sudo tailscale up` → open the URL · Daniel
11. **qcic-syno** · clone the repo (public; no GitHub credentials on the
    host; `<branch>` is `main` once qcic-core is merged) · agent

    ```sh
    git clone -b <branch> https://github.com/daneroo/im-qcic ~/Code/iMetrical/im-qcic
    ```

12. **galois → qcic-syno** · copy the three gitignored credentials · agent

    ```sh
    cd infra/qcic-core
    ssh qcic-syno mkdir -p Code/iMetrical/im-qcic/infra/qcic-core/credentials/caddy
    scp credentials/caddy/CREDS.env qcic-syno:Code/iMetrical/im-qcic/infra/qcic-core/credentials/caddy/
    scp credentials/credentials.{mysql,nats-prod}.json qcic-syno:Code/iMetrical/im-qcic/infra/qcic-core/credentials/
    ```

    | file                                     | used by        | canonical copy on galois                          |
    | ---------------------------------------- | -------------- | ------------------------------------------------- |
    | `credentials/caddy/CREDS.env`            | caddy (DNS-01) | `infra/gateway/credentials/caddy/CREDS.env`       |
    | `credentials/credentials.mysql.json`     | ted1k-derive   | `v2/infra/credentials/credentials.mysql.json`     |
    | `credentials/credentials.nats-prod.json` | scast-bridge   | `v2/infra/credentials/credentials.nats-prod.json` |

13. **qcic-syno** · `cd ~/Code/iMetrical/im-qcic/infra/qcic-core && just build`
    · agent (≈12 min on an idle Synology; ~40 min during a scrub)

### 5 · Start and verify

14. **Only one host may run the stack.** `scast-bridge` binds a durable push
    consumer on production NATS; a second instance fails with
    `duplicate subscription` (#297). Stop the stack on any other qcic-core
    or gateway2 host first · Daniel
15. **qcic-syno** · `just start` · agent
16. **qcic-syno** · verify **by worker logs, not `docker ps`** · agent
    - `nats`: `Server is ready`
    - `ted1k-derive`: `published` for all three views
    - `scast-bridge`: `copied`
    - `caddy`: certificates obtained for `<host>{,.ts}.imetrical.net` and
      `health.qcic{,.ts}.imetrical.net`
    - `curl -s -H 'Host: health.qcic.dl.imetrical.com' http://127.0.0.1/healthz` → 200

    A worker dead after a restart is #297 — `docker compose restart <worker>`.

## Operate

- Config change: edit `flake.nix`, push, then on the host
  `sudo nixos-rebuild switch --refresh --flake 'github:daneroo/im-qcic/<branch>?dir=infra/qcic-core#qcic-syno'`
- Stack: `just start`, `just down`, `just logs <service>`, `just status`

## Why it is built this way

- **ext4 in the guest, never btrfs.** The virtual disk already sits on the
  Synology's btrfs; guest btrfs on top tripled the cost of every fsync
  (59 → 177 ms) and doubled boot time. Boot is fsync-bound: Docker and
  containerd write small state files synchronously.
- **Disks by id** (`/dev/disk/by-id/scsi-…`), not `/dev/sdX`: attaching a
  second disk renamed them once.
- **GPT with BIOS-boot and ESP partitions**, GRUB installed for both: the
  same disk boots under Legacy BIOS or UEFI, on VMM or Proxmox.
- **State that is not in the flake:** `/var/lib/tailscale` (node identity),
  `/etc/ssh/ssh_host_*` (SSH identity; also the future secrets identity),
  `credentials/`, `data/`. A reinstall loses them unless carried.
- **Don't measure on the 24th.** The Synology scrubs monthly (24th, 05:00Z,
  no quiet hours) and slows every guest several-fold for hours.

## Not yet

- Secrets are copied by hand. Planned: agenix or sops-nix, encrypted to each
  host's SSH host key — in nix-garden first.
- `sudo` without a password (`wheelNeedsPassword = false`) is temporary.
- DHCP reservation, DNS A records, production's `reverse_proxy` target, and
  retiring gateway2 are #292's.
