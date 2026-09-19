# Synology → Gateway → Docker: startup times

Measured startup chain for `Syno → Gateway (VM) → Docker → NATS + Caddy`.
All figures below are measured, not estimated. Method and raw commands at the
bottom. Times are EDT; guest logs are UTC (−4).

## Event A — cold power cycle, 2026-09-19

Unplanned-style full power cut (desk UPS unplugged from wall while transferring
to the EcoFlow). Syno and Shannon power-cycled; Galois, Hilbert, Gauss did not.

| Time        | Event                                                  | t+       |
| ----------- | ------------------------------------------------------ | -------- |
| 14:17:32    | power cut                                              | 0        |
| 14:17:49    | Syno kernel boot                                       | 0:17     |
| 14:19:40    | `tailscaled` up on Syno                                | 2:08     |
| 14:19:52    | `dockerd` up on Syno                                   | 2:20     |
| 14:19:54    | `containerd` up on Syno                                | 2:22     |
| 14:19:56    | VMM `etcd` up                                          | 2:24     |
| 14:21:14    | QEMU #1 launched                                       | 3:42     |
| 14:21:20    | QEMU #2 launched                                       | 3:48     |
| 14:21:38    | Gateway guest kernel starts                            | 4:06     |
| 14:21:42    | guest modules loaded (`Btrfs loaded`, monotonic 4.32s) | 4:10     |
| 14:22:44    | guest root fs mounted (monotonic 66.55s)               | 5:12     |
| 14:22:57    | root re-mounted rw (monotonic 79.60s)                  | 5:25     |
| 14:23:00    | `fsck /dev/sda2: recovering journal` → clean           | 5:28     |
| 14:23:39    | Gateway SSH reachable                                  | 6:07     |
| 14:24:24–25 | all four containers started                            | 6:53     |
| 14:24:44    | `nats-server` first log line                           | 7:12     |
| 14:24:48    | **NATS "Server is ready"**                             | **7:16** |
| 14:24:54    | Caddy running                                          | 7:22     |

### Stage summary

| Stage                                     |  Duration | Share |
| ----------------------------------------- | --------: | ----: |
| Synology (power cut → QEMU launch)        |     3m42s |   51% |
| Gateway VM (QEMU → containers started)    |     3m11s |   44% |
| Docker services (containers → NATS ready) |       23s |    5% |
| **Total (power cut → NATS ready)**        | **7m16s** |       |

### Inside the Gateway VM stage

|                                                | Duration | Share of stage |
| ---------------------------------------------- | -------: | -------------: |
| BIOS / bootloader (QEMU → guest kernel)        |      24s |            13% |
| kernel init → modules loaded                   |       4s |             2% |
| **initramfs stall**                            |  **62s** |        **32%** |
| userspace (fsck, systemd, dockerd, containers) |     101s |            53% |

`systemd-analyze`: `1min 11.424s (kernel) + 2min 12.832s (userspace) = 3min 24.256s`

## Event B — graceful VM restart, 2026-09-18

Virtualization (VMM) package update restarted both VMs. Syno had been up 26
days, was idle, no scrub running. Isolates the VM from Synology's own boot.

| Monotonic | Event                                                                 |
| --------- | --------------------------------------------------------------------- |
| 0.000s    | guest kernel start (21:52:13.5 UTC)                                   |
| 4.192s    | `Btrfs loaded` — last message before stall                            |
| —         | **110.03s of complete silence**                                       |
| 114.225s  | `EXT4-fs (dm-0): mounted filesystem`                                  |
| 117.202s  | systemd starts                                                        |
| 148.014s  | systemd execs `dockerd`                                               |
| 160.3s    | `dockerd` first log (`Starting up`) — 12.3s unaccounted               |
| ~177s     | four containers started (within 1.3s of each other)                   |
| ~195s     | `dockerd` "completed initialization" (15s _after_ containers serving) |

`systemd-analyze`: `1min 56.405s (kernel) + 1min 19.711s (userspace) = 3min 16.117s`

`fsck`: `/dev/sda2: clean, 316/98304 files` — **no journal recovery** (graceful stop).

`systemd-analyze blame`, top entries:

```text
47.460s docker.service
25.836s apt-daily.service
24.105s man-db.service
12.513s systemd-random-seed.service
 9.276s systemd-journal-flush.service
 7.460s systemd-fsck@...
 7.005s containerd.service
 5.091s tailscaled.service
```

## A vs B

```text
                   2026-09-18     2026-09-19      delta
                    (graceful)   (power cut)
kernel phase          116.4s         71.4s        −45s
userspace              79.7s        132.8s        +53s
total                 196.1s        204.3s         +8s
kernel → containers   177s          167s          −10s
```

Two effects move in opposite directions and roughly cancel:

- **The initramfs stall is variable** — 110s vs 62s for the same bug.
- **Userspace is host-load sensitive** — 53s slower on 2026-09-19, booting into
  a Synology at load 11 with both VMs starting simultaneously, versus an idle
  host on 2026-09-18.

## Cause of the initramfs stall

The stall sits entirely between "modules loaded" and "root filesystem mounted",
with **zero kernel messages** for its duration. Silence followed by an instant
mount is a timeout signature, not slow I/O (slow storage logs progress).

Gateway's initramfs contains a full `open-iscsi` stack:

```text
scripts/local-top/iscsi          ← runs BEFORE root is mounted
scripts/local-bottom/iscsi
usr/sbin/iscsistart
etc/initiatorname.iscsi
```

`local-top/iscsi` brings up networking and attempts to reach iSCSI targets
before root is mounted. Gateway has no iSCSI root, so it waits and times out.

Contributing factors in the same initramfs:

- `MODULES=most` in `/etc/initramfs-tools/initramfs.conf`, which pulls in
  `hv_vmbus`, `hv_storvsc`, `hv_netvsc`, `be2iscsi`, `multipath.ko`
- `multipathd` is **enabled**, on a single-path virtio disk
- systemd reports `Detected virtualization microsoft` — Synology VMM presents
  Microsoft DMI strings, so Hyper-V paths may be probed

Note the irony: the guest runs an iSCSI initiator inside a VM whose disk is
_already_ an iSCSI LUN on the host, presented to the guest as a plain SCSI
device via `vhost-scsi`.

`docker.service` is stock — no `ExecStartPre`, no `/etc/docker/daemon.json`, no
drop-ins.

## Ruled out, with evidence

| Hypothesis                        | Verdict             | Evidence                                                                                                   |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Slow storage                      | **Ruled out**       | `drop_caches` then `time cat /usr/bin/dockerd` (97 MB) = **0.573s ≈ 170 MB/s**                             |
| CoW fragmentation of the LUN      | **Ruled out**       | `lsattr` shows `nodatacow` (`C`) set on all three LUN directories — CoW was never enabled for VM disk data |
| `fsck` as a major cost            | **Ruled out**       | 7.5s, and reports `clean` on graceful shutdown                                                             |
| QEMU overhead in the I/O path     | **Ruled out**       | disks are `vhost-scsi-pci` — in-kernel, QEMU not in the data path                                          |
| LUN snapshots affecting boot      | **No effect found** | nothing in either timeline attributable to them                                                            |
| Data scrubbing overlapping a boot | **Not a factor**    | scrub is 13h36m on a ~26-day cycle = 2.2% duty cycle                                                       |

## Confirmed

- **A hard power cut leaves the guest filesystem dirty.** Event B (graceful)
  reported `clean`; Event A reported `recovering journal`.
- **Synology has no UPS monitoring configured.** `synoups.conf` untouched since
  2021-06-24, no UPS on USB, `upsc ups@localhost` → connection refused. Nothing
  signals Syno to shut down, so every power event is a hard cut.

## Open / unmeasured

- **The 12.3s** between systemd exec'ing `dockerd` and `dockerd`'s first log in
  Event B. Not binary load (see ruled-out table). Untested hypothesis:
  CPU/IO contention from `apt-daily` (25.8s) and `man-db` (24.1s) running
  concurrently on 4 vCPUs.
- **Synology's internal 205s** — what DSM does between kernel boot and starting
  VMM. Not decomposed.
- Whether Container Manager's Docker start time (2m20s here) is consistent
  across boots. Single data point.

## Environment

**Syno** — DS1821+, DSM 7.4.1, kernel 4.4.302, x86_64, 8 cores, 33 GB RAM.
`/volume1` is btrfs on `md2` (RAID5, 5 disks, ~29.1 TiB) with an NVMe cache
(`md3`, raid0, ~372 GB) via `/dev/mapper/cachedev_0`.
Docker 24.0.2, storage driver **btrfs**, logging driver **db**, **cgroup v1**.

**Gateway** — Ubuntu 22.04.5, kernel 5.15.0-191, 4 vCPU, 15 GB RAM.
Docker 29.2.1, overlay2, 4 images / 4 containers. `dockerd` 97 MB,
`containerd` 46 MB.

**Gateway's disk** — a 200 GiB iSCSI **Block LUN** (`type=BLUN`), not a qcow2
file. Attached via `vhost-scsi-pci`, `wwpn=naa.bc6c6099-…`.

Each LUN is a directory under `/volume1/@iSCSI/LUN/VDISK_BLUN/<lun-uuid>/`
holding two sparse files:

| File                           |  Apparent | Allocated | Purpose                                                         |
| ------------------------------ | --------: | --------: | --------------------------------------------------------------- |
| `vdisk.<guest-uuid>.<…>_00000` | 200.0 GiB | 140.6 GiB | the disk image                                                  |
| `ROD`                          |   512 GiB |     **0** | T10 _Representation Of Data_ — ODX / copy-offload token scratch |

The vdisk filename embeds the **QEMU guest UUID** (`64c3bf7d-…` for Gateway),
and the allocated block count (147,461,864 KiB) matches the `mappedSize` field
in the snapshot config — two independent confirmations of the same figure.

The three LUN UUIDs map to VMs exactly as the QEMU `wwpn` values report:

```text
bc6c6099-ffac-4106-8242-dece59bc35c7   Gateway   (Feb 27 2022)
364c9809-3899-4c26-93ab-9e91f8393721   Pxbk #1   (Feb 26 2023)
18ef3e29-c71f-4a22-a541-c8e29ce91d28   Pxbk #2   (Feb 26 2023)
```

**`nodatacow` is set** on all three LUN directories (`lsattr` shows the `C`
flag), so copy-on-write is disabled for VM disk data and writes go in place.
Blocks referenced by a snapshot still copy once on next write.

Guest uses 12 GiB of the 140.6 GiB allocated — a four-year high-water mark, not
current usage. `fstrim.timer` is enabled and discard is advertised
(`DISC-GRAN 512B`, `DISC-MAX 32M`), yet the file never shrinks. Unresolved
whether UNMAP is reaching the backing file as hole-punching at all; snapshot
pinning does not explain it, since the retention window is only ~5 weeks. No
measurable effect on boot either way.

**Snapshot retention** — Gateway's policy is _1-day RPO: 0 hourly, 7 daily,
4 weekly, 0 monthly, 0 yearly_ = **11 snapshots**, matching the measured count
exactly. Oldest is ~4–5 weeks old. **Pxbk has no snapshots and no retention
policy** — appropriate, since PBS is itself a deduplicating store with its own
SHA-256 chunk hashes and verify jobs.

Snapshots are `isAppConsistence=no` (crash-consistent) despite
`qemu-guest-agent` being installed and **active** in the guest, with
`/dev/virtio-ports/org.qemu.guest_agent.0` present — so this is a snapshot
_option_ that was never requested, not a missing capability.

## Method

```bash
# Synology: boot time, and when each subsystem started
ssh syno 'date -d "-$(awk "{print int(\$1)}" /proc/uptime) seconds"'
ssh syno 'ps -eo pid,lstart,etime,comm | grep -iE "qemu|dockerd|tailscaled|etcd"'

# Gateway: overall and per-unit boot accounting
ssh gateway 'systemd-analyze; systemd-analyze blame | head -20'
ssh gateway 'systemd-analyze critical-chain'

# Gateway: locate silent gaps in the kernel timeline
ssh gateway 'journalctl -b -k -o short-monotonic --no-pager'

# Gateway: unclean-shutdown evidence
ssh gateway 'journalctl -b | grep -iE "fsck|recovering journal|not properly"'

# Gateway: when containers actually started (vs when docker.service finished)
ssh gateway 'for c in $(docker ps -q); do docker inspect $c \
  --format "{{.Name}} {{.State.StartedAt}}"; done'

# Gateway: when a service was actually READY (container start != serving)
ssh gateway 'docker logs gateway-nats-1 --since <ts> --timestamps'

# Gateway: cold read throughput (drop_caches is non-destructive)
ssh gateway 'sudo sh -c "sync; echo 3 > /proc/sys/vm/drop_caches"'
ssh gateway 'time cat /usr/bin/dockerd > /dev/null'

# Gateway: what is in the initramfs
ssh gateway 'lsinitramfs /boot/initrd.img-$(uname -r) | grep -iE "hv_|iscsi|multipath"'
ssh gateway 'grep ^MODULES /etc/initramfs-tools/initramfs.conf'
```

Caveats when reading journals:

- `journalctl -o short-monotonic` timestamps are **journald write times**, not
  emission times. Multiple `dockerd` lines share one monotonic stamp while
  their own embedded timestamps span seconds. Use the service's own clock.
- `docker logs … | head` shows the **oldest** logs. Gateway's containers were
  created 2025-09-12 and only restarted since, so `head` returns year-old
  output. Use `--since`.
- `docker.service` reaching "Started" is **not** time-to-service. In Event B
  containers were serving ~15s before systemd reported the unit active.

## Proposed experiment (not yet run)

Everything above is measurement. This section is a **plan**, written down for
review — it has not been executed and the judgment calls in it are not settled.

### Objective

Establish how much of Gateway's 3m11s VM stage is recoverable, and whether a
minimal purpose-built VM beats a de-crufted existing one. Synology's 3m42s
(51% of the total) is out of scope — nothing inside a VM affects it.

### Steps

1. **Clone Gateway → `gateway2`** in Synology VMM.
2. **De-conflict the clone** so it cannot touch real services (below).
3. **Reproduce the slow restart** on `gateway2` unmodified, confirming the
   stall is not a one-off. Take several samples.
4. **Tune `gateway2`** — remove `open-iscsi`, `multipath-tools`, `glances`,
   `cloud-init`; set `MODULES=dep`; rebuild initramfs — and re-measure.
5. **Compare against a thin alternative**, most likely a minimal NixOS VM,
   measured identically.

### De-conflict checklist

Do this **before the clone first touches the network** — remove or disconnect
its NIC in VMM and work from the console. Otherwise it boots holding Gateway's
Tailscale node key and possibly its DHCP lease.

```bash
# identity — systemd-networkd derives its DHCP DUID from machine-id,
# so a clone can claim the same lease
sudo rm -f /etc/machine-id /var/lib/dbus/machine-id
sudo systemd-machine-id-setup
sudo dbus-uuidgen --ensure
sudo hostnamectl set-hostname gateway2

# ssh host keys
sudo rm -f /etc/ssh/ssh_host_*
sudo dpkg-reconfigure openssh-server

# tailscale — clear the node key so it cannot fight the real node
sudo systemctl stop tailscaled
sudo rm -f /var/lib/tailscale/tailscaled.state

# confirm whether the IP is pinned
cat /etc/netplan/*.yaml        # Gateway is 192.168.2.101 on ens3
```

Also needed, both requiring a decision rather than a command:

- **Caddy** will attempt ACME for the real domains. It cannot succeed — the
  router forwards 443 to the real Gateway — but it will retry in a loop.
  Either drop `caddy` from the clone's `docker-compose.yaml`, or give it a
  trivial Caddyfile (`:80 { respond "ok" }`). The second keeps the container
  count at four so the comparison stays like-for-like.
- **natsql** has `NATSURL: nats://nats.ts.imetrical.com:4222` in compose, which
  resolves to the **real** Gateway. Repoint to `nats:4222` (the local service).

### Constraints and confounders

These are measured, and any experiment design has to account for them:

- **RAM.** Syno has 31.3 GiB; Gateway (15 GiB) and Pxbk hold ~18.6 GiB. A clone
  at Gateway's allocation will not fit. Gateway idles at **459 MB used** with
  all four containers running (`nats` 66 MB, `natsql` 35 MB, `status` 29 MB,
  `caddy` 14 MB), and swap has never been touched — so a much smaller clone is
  viable. Note that image *builds* are far more memory-hungry than runtime.
- **Host load contaminates results.** Userspace boot was 67% slower (79.7s →
  132.8s) purely from Synology contention. A/B runs need similar host
  conditions, and repetition.
- **The stall itself is variable** — 110s and 62s observed for the same bug.
  A single sample cannot distinguish a real improvement from noise.
- **Tailscale is 5.091s of boot.** Leaving the clone logged out makes it look
  faster for a reason unrelated to what is being tested; rejoining it as
  `gateway2` keeps the comparison honest but adds a tailnet node.
- **Keep the cruft until step 3 is done.** `open-iscsi`, `multipath-tools` and
  `MODULES=most` are the thing under test.

### Open questions for a reviewer

- Is a clone the right vehicle, or does its LUN/snapshot lineage differ enough
  from a fresh VM to make the NixOS comparison unfair?
- What is the right success metric — time to `nats-server` "Server is ready",
  or something earlier/later?
- How many samples per configuration, given the observed variance?
- Is step 4 (tuning Ubuntu) worth running at all if step 5 (NixOS) is the
  intended destination regardless?
