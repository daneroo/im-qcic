# Fio

Disk I/O characterization scripts (raw `fio` job files). Unpretty, unfinished, but genuinely useful for comparing disk/filesystem performance across systems — e.g. SSD on Galois vs btrfs mirror on Gauss vs RAID5-in-docker on Syno. The Kasten Learning / `kubestr` (Kubernetes storage benchmarking) framing this originally came from is stale — that context no longer applies — but the underlying fio job files (`simple-rw.fio`, `ssd-test.fio`) still are.

## Language

**Fio job file**:
A `.fio` config (`[global]` + named job sections like `seq-read`, `rand-write`) run via `fio -f <file>` — not `kubestr` (the k8s-specific wrapper is no longer relevant here).
