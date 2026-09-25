# qcic-core

The QCIC v2 services (NATS, health, ted1k-derive, scast-bridge, plus Caddy) as
a **docker compose** stack, together with the **NixOS flake** for the host(s)
that run it. Today that is one host, `qcic-syno`, a VM on the Synology; a
second host would be another entry in `flake.nix`. Background:
[docs/virtualization-guide.md](../../docs/virtualization-guide.md).

## Usage

```sh
just        # lists every recipe, grouped by where it runs
```

- **nix · on galois (dev):** edit `flake.nix`, `just flake-check`, commit, push.
- **nix · on vm:** `just nixos-update` pulls and switches, and says whether a
  reboot is needed.
- **docker · on vm:** `ps`, `build`, `start`, `down`, `restart`, `logs`.
- **provision · from NixOS host:** once per new VM (below).

The flake writes `/etc/qcic-core/host.env` (`HOSTALIAS`, `HOST_NAME`, derived
from the hostname); the recipes pass it to compose, and plain `docker compose`
refuses to start without it.

## How qcic-syno was provisioned

A VMM VM (Q35, UEFI, 4 vCPU, 4 GB, 200 GB) booted from a NixOS installer ISO
(GRUB → Options → No modesetting, or VMM's console freezes). With root on the
installer reachable by gauss's SSH key and the disk's id pinned in `flake.nix`
(`just provision-disks <ip>`), one command from gauss installs it:

```sh
just provision qcic-syno <ip>
```

Then: unmount the ISO, `sudo tailscale up`, clone this repo, copy
`credentials/` from galois (gitignored), `just build start`.
