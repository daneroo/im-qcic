# Virtualization on the Synology

## Scope

- **qcic-core** (`infra/qcic-core`) runs as one NixOS VM, `qcic-syno`, on the
  Synology (VMM); it may become several VMs later. The host is NixOS, and its
  flake lives in the same directory as the docker compose stack it runs.
- **gateway** is the legacy Ubuntu VM, kept for now: the legacy NATS server
  and public ingress (Caddy for the `.dl` sites).

## Where restart time goes

A full Synology restart takes **7–9 min** to NATS ready. About **3–3.5 min
is the Synology itself** (DSM boot up to VMM starting its VMs); nothing inside
a VM changes that, and guests boot several times slower while it settles.

Inside the VM, we first blamed a 62–110s initramfs stall on gateway's iSCSI
stack. That was wrong: a clone with the identical stack did not stall. The
lever that moved VM boot time was **sync-write latency**. Boot is fsync-bound
(Docker and containerd write small state files synchronously), and the
virtual disk already sits on the Synology's btrfs; btrfs inside the guest
copies-on-write a second time and made each fsync ~3× slower (200 × 4 KiB
`dd oflag=dsync`: ext4 guest 59 ms, btrfs guest 177 ms). **ext4 in the guest,
btrfs on the Synology** is the compromise: the Synology keeps snapshots and
checksums; guests boot fast.

## Start order and priority

VMM cannot order VM starts (only Autostart yes / last state / no). It does
set **priority**, a weight under CPU and I/O contention: gateway **High**,
qcic-syno **Above normal**, Pxbk Normal.

## Timings

Restart → NATS ready.

| restart                           | time     |
| --------------------------------- | -------- |
| Full Synology restart             | ~7m      |
| VM: Ubuntu 22.04, ext4 (gateway)  | up to 3m |
| VM: NixOS 26.05, btrfs            | ~40s     |
| VM: NixOS 26.05, ext4 (qcic-syno) | ~23s     |
