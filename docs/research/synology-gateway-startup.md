# Synology → Gateway → Docker: startup times

Measured startup chain for `Syno → Gateway (VM) → Docker → NATS + Caddy`.
All figures below are measured, not estimated. Method and raw commands at the
bottom. Times are EDT; guest logs are UTC (−4).

> **Takeaway, 2026-09-24 — what the availability story has to account for.**
>
> - **VM restart: ~25–30s** to NATS ready. That is the floor.
> - **Full Synology cycle: up to ~9 min.** Power cut 7m16s; planned DSM
>   restart 8m15s (shutdown ~1.5 min + boot ~6.5 min). The Synology's own
>   stage before any VM starts is a stable ~3 min, and guests boot ~7× slower
>   while it settles. A DSM *Shut Down* can also hang at power-off (once in
>   one sample, 72 min, no trace in any log).
>
> Every measured boot and both shutdowns:
> [synology-gateway-startup-timeline.html](synology-gateway-startup-timeline.html).
> Detail in [infra/qcic-core/ROLLOUT-gateway2.md](../../infra/qcic-core/ROLLOUT-gateway2.md) C1–C2.

> **Status, 2026-09-22.** The experiment this document proposed has now been
> partly run, and it **falsified the stated cause of the initramfs stall**. See
> [The initramfs stall](#the-initramfs-stall--stated-cause-falsified-as-sufficient)
> and [The experiment](#the-experiment--what-was-run-and-what-it-returned).
> Operational state lives in
> [infra/qcic-core/ROLLOUT-gateway2.md](../../infra/qcic-core/ROLLOUT-gateway2.md).

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

**Worth stating plainly, because it is easy to misread:** this event involved
**no power failure**. It was a graceful restart on an idle host — and it
produced the **worst** stall of the two, 110s against Event A's 62s. The stall
is not a consequence of unclean shutdown. What *is* specific to the power cut
is the dirty filesystem: Event A reported `recovering journal`, Event B
reported `clean`.

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

## The initramfs stall — stated cause, falsified as sufficient

> **This section's original conclusion did not survive testing.** It is kept,
> corrected in place, because the evidence in it is still sound — it is the
> *inference* that was too strong.

The stall sits entirely between "modules loaded" and "root filesystem mounted",
with **zero kernel messages** for its duration.

### What was measured on a second, identical guest

`gateway2` is a clone of Gateway. Five graceful VMM restarts on 2026-09-22
(ROLLOUT.md, A5) put its stall slot at **0.513s–0.724s — all five samples**,
while carrying every condition named below. A direct read-only comparison of
the two guests the same day:

| | Gateway | gateway2 |
| - | - | - |
| kernel, cmdline, disk, LVM layout | — | *identical* |
| `MODULES=most` | yes | yes |
| `local-top/iscsi`, `iscsistart`, `be2iscsi`, `multipath.ko`, `hv_*` | yes | yes |
| `open-iscsi`, `multipath-tools`, `cloud-init` installed | yes | yes |
| `systemd-detect-virt` | `microsoft` | `microsoft` |
| `/etc/iscsi/nodes` | **absent** | **absent** |
| RAM | 15989 MiB | 3911 MiB |
| **stall** | **62–110s** | **0.513–0.724s** |

One stalls, the other does not, on an identical software stack. **The cause
below is therefore falsified as a sufficient explanation.**

Note in particular that *neither* host has an iSCSI node database, so
`local-top/iscsi` has no target to time out against on either machine. The
original reasoning assumed this and never checked it.

### Two caveats on the reasoning, not just the conclusion

- "Silence followed by an instant mount is a timeout signature" is weaker than
  it reads. LVM activation in the initramfs is **userspace** and emits nothing
  to the kernel ring buffer, so silence in `journalctl -k` does not distinguish
  a timeout from slow work that simply does not log.
- The "slow storage — ruled out" row below rests on a `drop_caches` test taken
  on a **warm, idle** Synology, which does not reproduce boot-time host
  conditions.

### What remains standing

Two differentiators between the two guests, neither of them guest software:

- **Host-side LUN lineage.** Gateway's LUN is four years old, 140.6 GiB
  allocated, 11 snapshots. gateway2's backing file is younger. Not verified —
  reading `/volume1/@iSCSI/LUN/VDISK_BLUN/` needs root on syno.
- **Guest RAM**, 15.6 GiB against 3.8 GiB, and with it the size of the
  initramfs unpack and the LVM scan.

### The original finding, kept for the record

Gateway's initramfs contains a full `open-iscsi` stack:

```text
scripts/local-top/iscsi          ← runs BEFORE root is mounted
scripts/local-bottom/iscsi
usr/sbin/iscsistart
etc/initiatorname.iscsi
```

`local-top/iscsi` brings up networking and attempts to reach iSCSI targets
before root is mounted. Gateway has no iSCSI root, so the inference was that it
waits and times out. **That inference is the falsified part** — gateway2 has
the identical script and does not stall, and neither host has an
`/etc/iscsi/nodes` database for the script to act on.

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

**Caveat on row 1, added 2026-09-22.** That measurement was taken on a warm,
idle Synology from a running guest. It says cold reads are fast *under those
conditions*; it does not say they are fast during a boot with the host's cache
cold and VMM starting two VMs. Treat "slow storage" as **not reproduced**
rather than ruled out.

## Confirmed

- **A hard power cut leaves the guest filesystem dirty.** Event B (graceful)
  reported `clean`; Event A reported `recovering journal`.
- **Synology has no UPS monitoring configured.** `synoups.conf` untouched since
  2021-06-24, no UPS on USB, `upsc ups@localhost` → connection refused. Nothing
  signals Syno to shut down, so every power event is a hard cut.

  **Re-verified 2026-09-22 21:05Z — unchanged.** `synoups.conf` still 17 bytes,
  mtime `Jun 24 2021`; `upsc ups@localhost` still refuses. `synoinfo.conf` has
  `supportups="yes"`, but that is DSM's *capability* flag, not configuration —
  no daemon is listening. **Better UPS hardware does not change this.** Until
  DSM is configured to shut down on a UPS signal, every power event remains a
  hard cut and lands in the Event A case.

## Open / unmeasured

**The largest unmeasured share is the Synology's own boot**, and it has only
ever been sampled once.

- **Synology's internal 205s** — what DSM does between kernel boot and starting
  VMM. Not decomposed. This is **51% of the whole chain** (3m42s of 7m16s) and
  nothing inside a VM affects it. Every measurement taken since Event A has
  been a VM restart, which cannot see it. Now the subject of ROLLOUT.md
  Phase C2, gated on a decision — a Synology restart is a controlled outage of
  everything on it.
- **What a *graceful* full-chain restart costs.** Event A is a power cut and is
  the only full-chain sample. A warm DSM reboot has never been measured.
- **Whether the guest stall reproduces at all when the host is cold.** Both
  62s and 110s samples came from a host that had been up for days. gateway2's
  0.5s samples likewise. Host cache state has never been varied deliberately.
- **The 12.3s** between systemd exec'ing `dockerd` and `dockerd`'s first log in
  Event B. Not binary load (see ruled-out table). Untested hypothesis:
  CPU/IO contention from `apt-daily` (25.8s) and `man-db` (24.1s) running
  concurrently on 4 vCPUs.
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

**gateway2** — clone of Gateway, created 2026-09-22. Same Ubuntu 22.04.5 and
kernel 5.15.0-191. **4 vCPU, 3911 MiB**, five containers (`caddy`, `nats`,
`health`, `ted1k-derive`, `scast-bridge`). `192.168.2.138`. Identical guest
software stack to Gateway — see the falsification table above. Stood up under
issue #293; standing state in `infra/qcic-core/ROLLOUT-gateway2.md`.

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

## The experiment — what was run, and what it returned

This section was a **plan** until 2026-09-22. Steps 1–3 have now been executed
and step 3 returned a negative result that invalidated step 4. Operational
detail and the raw samples live in
[infra/qcic-core/ROLLOUT-gateway2.md](../../infra/qcic-core/ROLLOUT-gateway2.md).

### Objective, as originally stated

Establish how much of Gateway's 3m11s VM stage is recoverable, and whether a
minimal purpose-built VM beats a de-crufted existing one. Synology's 3m42s
(51% of the total) was declared out of scope — "nothing inside a VM affects
it." **That exclusion is now the main criticism of this document:** it scoped
out the larger half of the problem, and everything measured since has been
inside a VM.

### Steps and outcomes

| # | Step | Outcome |
| - | ---- | ------- |
| 1 | Clone Gateway → `gateway2` in VMM | **Done** (#293) |
| 2 | De-conflict the clone | **Done** (#293). The checklist below was broadly right; the trap it missed is recorded in ROLLOUT.md A2 — the clone's inherited Docker project restarts itself the moment the daemon is unmasked |
| 3 | Reproduce the slow restart on `gateway2` unmodified | **Done, and it did not reproduce** (#294). Five graceful VMM restarts, stall slot **0.513s–0.724s** every time, against Gateway's 62–110s — on an identical software stack |
| 4 | Tune `gateway2` (remove the iSCSI/multipath stack, `MODULES=dep`) and re-measure | **Withdrawn.** Step 3 removed the thing it would have measured. There is no stall on gateway2 to move, so no timing claim is available. Recorded in ROLLOUT.md C0 |
| 5 | Compare against a thin alternative (NixOS) | **Reopened as exploratory** — #298, with the method deliberately left undecided |

### The samples from step 3

Five graceful VMM restarts, gateway2, 2026-09-22 18:53–19:03Z, 3911 MiB /
4 vCPU, five containers. Stall measured between the same two markers as
Event B (`Btrfs loaded` → `EXT4-fs (dm-0): mounted filesystem`).

| # | kernel | userspace | stall | total |
| - | ------ | --------- | ----- | ----- |
| 1 | 5.678s | 1m02.333s | 0.586s | 1m08.0s |
| 2 | 4.575s | 35.059s | 0.709s | 39.6s |
| 3 | 4.460s | 36.123s | 0.513s | 40.6s |
| 4 | 4.546s | 36.412s | 0.518s | 41.0s |
| 5 | 4.843s | 36.570s | 0.724s | 41.4s |

Sample 1 followed 2.5 days of uptime; its extra userspace is concentrated in
`udisks2`, `containerd` and `systemd-journal-flush`. Samples 2–5 were minutes
apart.

**Confounds, stated:** 3.8 GiB against Gateway's 15.6 GiB; five containers
against four, and not the same ones; all five samples inside one ten-minute
window, so they share a single sample of the Synology's concurrent load rather
than five.

**What the sampling also found, unrelated to boot timing:** two of the five
containers can come up dead — `Up`, `restarts=0`, run loop finished. Filed as
**#297**. Consequence for any future measurement here: *container status does
not establish that the stack is serving*. Read the workers' own logs.

### Where this leaves the question

The chain is 7m16s. The VM stage was 3m11s of it and a replacement VM now does
the equivalent in **~40s**, without removing a single package. The Synology's
3m42s has never been decomposed and is now the larger share by far.

**The useful remaining experiment is a Synology restart — warm, and possibly
cold — not another VM restart.** That is ROLLOUT.md Phase C2, and it is gated
on an explicit decision because it is a controlled outage of everything on the
host. Note also that the cold case cannot be tested meaningfully until DSM UPS
monitoring is configured; see the Confirmed section.

### De-conflict checklist, as used

Kept because it worked, and because the next clone will need it. Do this
**before the clone first touches the network** — remove or disconnect its NIC
in VMM and work from the console. Otherwise it boots holding Gateway's
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

**Missing from the list above, and it cost an additive-only breach:** the
clone's `infra/gateway/` carries a complete production Docker project whose
containers were created `restart: unless-stopped`. Unmasking the daemon
resumes them. Full account in ROLLOUT.md A2.

### Constraints and confounders — updated

- **RAM.** ~~A clone at Gateway's allocation will not fit.~~ Correct, but the
  concern behind it was wrong: gateway2 runs the whole five-container stack in
  3911 MiB and *built* it with a peak of 742 MiB. Not a constraint.
- **Host load contaminates results.** Still true and still unaddressed —
  userspace moved 53s on host contention alone, and the five A5 samples share
  one host-load sample between them.
- **The stall itself is variable** — 110s and 62s for the same bug on Gateway.
  Moot for gateway2, which does not exhibit it.
- **Tailscale is 5.091s of boot.** gateway2 is joined as its own node, so the
  comparison stays honest.
- ~~**Keep the cruft until step 3 is done.**~~ Step 3 is done. The cruft is
  still there, and on current evidence removing it buys nothing measurable.

### Open questions — answered where they can be

- *Is a clone the right vehicle?* Good enough for step 3, which is what
  mattered — and the negative result is more informative than a positive one
  would have been. LUN lineage remains an unverified differentiator.
- *What is the right success metric?* Settled in practice: first-to-last
  container `StartedAt` as an offset from `uptime -s`, with NATS readiness read
  from the service's own log. Container start is **not** service ready, and
  `docker.service` active is neither.
- *How many samples?* Five was enough to answer step 3 decisively, because the
  effect size was two orders of magnitude. It is **not** enough to detect a
  small improvement against host-load noise.
- *Is step 4 worth running if step 5 is the destination?* Answered by events:
  no, and step 4 is withdrawn for a stronger reason than priority.
