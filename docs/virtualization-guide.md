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

Restart → NATS ready. One character ≈ 10s.
`S` Synology · `q` QEMU → guest kernel · `k` guest kernel + initrd (stall) ·
`u` userspace → NATS ready.

```text
                                              0     1m    2m    3m    4m    5m    6m    7m
Full Synology restarts (from power cut / Synology boot)
 gateway      Ubuntu 22.04  power cut  09-19  SSSSSSSSSSSSSSSSSSSSSSqqkkkkkkkuuuuuuuuuuuu    7m16s
 gateway2     Ubuntu 24.04  DSM off+on 09-23  SSSSSSSSSSSSSSSSSSSSSqqkkuuuuuuuuuuuuuuuu      6m54s
 gateway2     Ubuntu 24.04  DSM restart 09-24 SSSSSSSSSSSSSSSSSSSqqkkkkuuuuuuuuuuuuuuuuu     7m06s
VM restarts only (from guest kernel)
 gateway      Ubuntu 22.04  ext4       09-18  kkkkkkkkkkkkuuuuuu                            ~3m  (containers 2m57s)
 gateway2     Ubuntu 24.04  ext4       09-23  kuu                                           25–27s
 gateway-nix  NixOS 26.05   btrfs      09-24  kuuu                                          31–39s
 qcic-syno    NixOS 26.05   ext4       09-25  ku                                            19–23s
```

The full-restart rows are single samples; the VM rows are 3–5 samples each on
a quiet Synology. A DSM restart adds ~1.5 min of shutdown before the Synology
boots.
