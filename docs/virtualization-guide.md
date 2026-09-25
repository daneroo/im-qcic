# Virtualization on the Synology

## Scope

- **qcic-core** (`infra/qcic-core`) runs as one NixOS VM, `qcic-syno`, on the
  Synology (VMM); it may become several VMs later. The host is NixOS, and its
  flake lives in the same directory as the docker compose stack it runs.
- **gateway** is the legacy Ubuntu VM, kept for now: the legacy NATS server
  and public ingress (Caddy for the `.dl` sites).

## Where restart time goes

- **Synology itself:** ~3 min of a ~7 min full restart, before any VM starts.
  Incompressible from inside a VM.
- **initramfs stall** (62–110s on gateway, blamed on its iSCSI stack): a false
  lead; a clone with the same stack did not stall.
- **Guest filesystem sync-write latency is the key to VM boot time.** Boot is
  fsync-bound (Docker, containerd); btrfs in the guest on the Synology's btrfs
  made each fsync ~3× slower than ext4.
- **ext4 in the guest keeps integrity:** the Synology's btrfs still checksums
  and snapshots the virtual disk.
- **We only lose guest-native snapshots**, which is fine for the current
  workload (little state).

## Start order and priority

VMM cannot order VM starts (only Autostart yes / last state / no). It does
set **priority**, a weight under CPU and I/O contention: gateway **High**,
qcic-syno **Above normal**, Pxbk Normal.

## Timings

Restart → NATS ready.

| restart               | guest       | OS           | filesystem | time     |
| --------------------- | ----------- | ------------ | ---------- | -------- |
| Full Synology restart | all         |              |            | ~7m      |
| VM restart            | gateway     | Ubuntu 22.04 | ext4       | up to 3m |
| VM restart            | gateway-nix | NixOS 26.05  | btrfs      | ~40s     |
| VM restart            | qcic-syno   | NixOS 26.05  | ext4       | ~23s     |
