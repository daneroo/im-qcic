# gateway2 rollout

Tracking file for standing up `gateway2` and finishing the Synology restart
diagnostics in [docs/research/synology-gateway-startup.md](../../docs/research/synology-gateway-startup.md).

**Governing rule: gateway2 is additive-only.** Nothing currently running
changes state. Phase A is *intended* to touch no production machine at all —
it breached that once, on 2026-09-22, when unmasking docker resumed the stack
this VM inherited from its parent. See the trap note in A2; the rule stands,
but it is not self-enforcing.

`gateway2` is a transitory name — at least one more iteration of the
replacement server is expected, so nothing client-facing is named after the
host.

Check boxes as work lands. Record measurements inline under Phase A5 / C.

## Tickets

Spec: **#292**. Decisions and their reasoning live there; state lives here.

| Ticket | Covers | Blocked by |
| ------ | ------ | ---------- |
| **#293** | Phase A, sections A0–A4 | — · **done 2026-09-22** |
| **#294** | Phase A, section A5 | #293 |
| **#295** | Phase B | #293 |
| **#296** | Phase C | #294 |

---

## Phase 0 — repo

- [x] `infra/gateway2/` written: `compose.yaml`, `Justfile`, `Dockerfile-caddy`,
      `config/caddy/Caddyfile`, `config/nats/nats-server.conf`, `.gitignore`
- [x] `docker compose config` parses; build contexts resolve to `../../v2`;
      `HOSTALIAS` resolves to `gateway2`
- [x] `http://` prefix on the `.dl.` site confirmed to suppress automatic HTTPS
      (verified via `caddy adapt`: that host lands on the `:80` server with no
      TLS policy)
- [x] Commit and push `infra/gateway2/`

## Phase A — stand up gateway2 (additive-only) · #293, #294

### A0 · Build-only smoke test on galois

Catches path/syntax errors before touching the VM. **Build only — do not
start.** Galois is arm64 and gateway2 is x86_64, so these images are not
deployable; this does not tell you whether the build fits in 3.8 GiB.

- [x] `just build` — all four images built on galois (2026-09-22)
- [x] `docker run --rm -e CF_API_TOKEN=0123456789abcdef0123456789abcdef01234567 -v "$PWD/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" gateway2-caddy caddy validate --config /etc/caddy/Caddyfile`
      — validates the Caddyfile *including* the cloudflare DNS plugin, without
      starting anything or contacting an ACME server. Returns
      `Valid configuration`.

      `CF_API_TOKEN` must be set to a **40-character** placeholder. The
      cloudflare module validates the token's *shape* when it provisions the
      module, so an unset variable fails with ``API token '' appears
      invalid``, and a descriptive string like `dummy-token` fails the same
      way. The value is never used — `validate` contacts nothing.

      Bonus confirmation of Phase 0's `http://` finding, logged inline by
      this run: `srv1` "is listening only on the HTTP port, so no automatic
      HTTPS will be applied".

### A1 · DNS — Cloudflare only, zone `imetrical.net`

All four **DNS only (grey cloud)**. Cloudflare cannot proxy RFC1918 or CGNAT
addresses, and proxying would break both names.

- [x] `A  gateway2         192.168.2.138`  — DNS-01 proof + Phase B upstream
- [x] `A  gateway2.ts      100.99.157.63`  — DNS-01 proof, tailnet
- [x] `A  health.qcic      192.168.2.138`  — direct to health, LAN
- [x] `A  health.qcic.ts   100.99.157.63`  — direct to health, tailnet

Created 2026-09-22. All four verified against both `1.1.1.1` and `8.8.8.8`,
returning the addresses above rather than the zone's catch-all parking IP
`64.98.145.30` (which is what they returned before). Grey cloud needs no
separate check: Cloudflare cannot proxy RFC1918 or CGNAT, so an answer of
`192.168.2.138` / `100.99.157.63` is itself proof the records are DNS-only.

**Hover / `imetrical.com`: no changes.** Verified authoritatively —
`health.qcic.dl.imetrical.com` already resolves through the existing `*.dl`
wildcard CNAME → `syno-im.synology.me` → `142.170.38.42`.

Note: DNS-01 validation uses TXT records, so certificate *issuance* does not
depend on these A records. They control reachability only.

### A2 · Prepare gateway2

**Trap — read before unmasking on any fresh clone.** gateway2 is a clone of
gateway, so `infra/gateway/` on it carries a complete *production* stack whose
containers were created with `restart: unless-stopped`. The systemd mask was
the only thing holding them. Starting the daemon resumed all four
(`caddy`, `nats`, `natsql`, `status`) with no further command — a direct
breach of the additive-only rule.

What that cost on 2026-09-22, 17:32:50–17:34:44: `natsql` joined the
*production* bus and republished heartbeats under the production identity
`natsql.dl.imetrical.com`. Nothing durable — `natsql` has no database path
(no `INSERT`/`REPLACE` in `packages/natsql/src`; it is a GraphQL↔NATS
bridge), `caddy` renewed only `localhost` from its local issuer and merely
read ARI for the public names, and `nats` restored the *clone's* stale
JetStream dir, not production's. Resolved by `docker compose stop` then
`docker compose rm` on the inherited project.

Note the ordering trap has no clean escape: `docker compose down` needs a
running daemon, so you cannot neutralize the inherited project before the
daemon starts it. Editing the compose file does not help either — the restart
policy is baked into the existing containers at creation. On a fresh clone,
either sever the VM from the tailnet/LAN first, start the daemon, `down` the
inherited project, and restore networking; or accept a few seconds of
exposure and `down` it immediately.

- [x] **First:** confirm the inherited `gateway` project is gone —
      `docker compose ls -a` must not list it. Done 2026-09-22: all four
      containers removed, so a future daemon start is now safe.
- [x] `sudo systemctl unmask docker.socket && sudo systemctl unmask docker && sudo systemctl enable --now docker`
      (currently masked, as deliberate deconfliction). **Daniel must run this** —
      `sudo` on gateway2 requires a password, so an agent over SSH cannot.

      **`docker.socket` is masked too, and must be unmasked first.** Unmasking
      only `docker.service` gets you as far as `Failed to start
      docker.service: Unit docker.socket is masked.` Verified 2026-09-22:
      both units plus `containerd.service` now enabled and active, daemon
      29.2.1 answering.
- [x] Revert the clone's hand-edits to `infra/gateway/{config/caddy/Caddyfile,docker-compose.yaml}`
      — these are uncommitted changes to *tracked* files and will block the
      checkout below. All four files below are stamped `2026-09-19 22:35`,
      so this was one sitting. The Caddyfile was gutted from 2637 bytes to
      25 (`:80 { respond "ok" }`) and `natsql`'s `NATSURL` was repointed from
      `nats.ts.imetrical.com:4222` to `nats:4222` — a reachability experiment
      on the clone, never intended to land.
- [x] Delete `infra/gateway/*.gateway2-original` (2 files) — untracked
      pre-edit backups made in that same sitting, existing only on the VM and
      referenced nowhere but this line. Both were diffed against
      `git show HEAD:<file>` and are **byte-identical to committed HEAD**, so
      the revert above already restores their content and deleting them loses
      nothing.
- [x] `git fetch origin && git checkout agent/gateway2-rollout` — **not
      `git pull`**. `infra/gateway2/` only exists on the feature branch until
      the PR merges, so gateway2's clone has to sit on the branch to run any
      of this. Verified reachable from gateway2 over SSH.
- [x] After the PR merges: `git checkout main && git pull` to put the clone
      back on the mainline — done 2026-09-22, PR #291 merged as `bfd81dd3`.
      `compose.yaml` and `Caddyfile` checksums were identical either side of
      the switch, so the running stack did not drift from what is on disk;
      all five containers stayed up and health kept returning 200.
- [x] Copy in `credentials/caddy/CREDS.env` (existing `CF_API_TOKEN`) —
      copied *locally on the VM* from `infra/gateway/credentials/caddy/`, which
      already holds the same scoped token; no secret crosses machines
- [x] Copy in `credentials/credentials.mysql.json` (ted1k-derive) — scp'd
      from galois `v2/infra/credentials/`, the only copy
- [x] Copy in `credentials/credentials.nats-prod.json` (scast-bridge) — scp'd
      from galois `v2/infra/credentials/`, the only copy

`credentials/` and `data/` are gitignored, so the checkout never brings these;
they have to be placed by hand on every new host. `docker compose config`
confirms all three resolve.

### A3 · Build and start

- [x] Optionally raise RAM above 3.8 GiB for the build — `xcaddy` and the Bun
      builds are the hungry ones. No cross-build escape hatch exists: galois is
      arm64, and `ghcr.io/daneroo/caddy:2-dns` returns 403 (never shipped).

      **Not needed.** Measured 2026-09-22 on the VM untouched at 3911 MiB /
      4 vCPU: **peak 742 MiB, 3.2 GiB headroom, swap never left 1 MiB.**
      `xcaddy` — the step feared most — passed without incident. The RAM was
      never raised, so "drop RAM back before measuring" below is a no-op and
      #294's baseline comes from a VM that was never resized.

      Confirmed against the big machine the same day. Gateway (15.6 GiB)
      built its own four-service stack in **572.8s**; gateway2 (3.8 GiB) took
      **690s** — only ~17% slower on a quarter of the RAM. Different image
      sets, so not a controlled comparison, but four times the memory buying
      17% says the build is CPU/IO bound, not memory bound. The OOM risk was
      never real.
- [x] `just build` — **~11m30s wall clock** (17:40:00 → ~17:51:30), `EXIT=0`,
      all four images. Worth keeping as the number to beat once images are
      built elsewhere and pulled.
- [x] `just start` — five containers up 2026-09-22 18:00
- [x] **Drop RAM back to 3.8 GiB before measuring** — no-op, never raised

### A4 · Verify

- [x] `https://gateway2.ts.imetrical.net` → "Hello, gateway2!" (DNS-01 works)
- [x] `https://gateway2.imetrical.net` → same, over LAN
- [x] `https://health.qcic.ts.imetrical.net/healthz` → 200
- [x] `https://health.qcic.imetrical.net/healthz` → 200 (direct LAN name; in
      #293's acceptance criteria, was missing from this list)
- [x] `just status` → 5 containers up
- [x] `docker compose logs nats` → healthy
- [x] `docker compose logs scast-bridge` → reading production's `scrobblecastDigest`
- [x] `docker compose logs ted1k-derive` → polling Darwin's MySQL

Verified 2026-09-22 18:01. All four certificates issued by the real
Let's Encrypt CA via DNS-01 — `gateway2{,.ts}` and `health.qcic{,.ts}` —
which is the transitive proof #293 asks for: DNS resolves, issuance works
against the real CA, Caddy routes by host, health serves.

Health returns `{"observer":"gateway2","tailnet":{"available":true},
"nats":{"available":true}}` — both observations live.

Both workers are doing real work against their upstreams, not merely running:
`scast-bridge` copying digests from `d1-px1`, `darwin` and `scast-hilbert`
around seq 1338693; `ted1k-derive` publishing all three views
(`missingLastDay`, `missingDayByHour`, `missingWeekByDay`), which only
succeeds if Darwin's MySQL is reachable.

### A5 · Baseline restart samples — with-workload baseline · #294

VMM restarts are graceful, so these compare to the doc's Event B (3m16s).

- [x] Sample 1
- [ ] Sample 2
- [ ] Sample 3
- [ ] Sample 4
- [ ] Sample 5

Per run collect: `systemd-analyze`, `systemd-analyze blame | head -20`,
`journalctl -b -k -o short-monotonic` (locate the initramfs stall), and
`docker inspect --format '{{.Name}} {{.State.StartedAt}}'` for all five.

Stated confounds: 3.8 GiB vs gateway's 15.6 GiB; five containers vs four;
Synology's concurrent load.

The stall is the silence between `Btrfs loaded` and
`EXT4-fs (dm-0): mounted filesystem` — the same two markers the research doc
uses for Event B's 110.03s. "Containers started" is the first and last of the
five `StartedAt` stamps, expressed as an offset from `uptime -s`.

| # | kernel | userspace | stall | containers started | notes |
| - | ------ | --------- | ----- | ------------------ | ----- |
| 1 | 5.678s | 1m02.333s | **0.586s** | +37.5s → +39.7s | boot 18:53:07Z; total 1m08.0s; `fsck` clean; `docker.service` 41.1s; all five `restarts=0` |

## Phase B — expose health publicly (touches production) · #295

- [x] `git pull` on **production gateway's** clone first. It is 91 commits
      behind at `eeac2a88` (2026-02-24) and has never fetched; the delta under
      `infra/gateway/` is two doc files — verifiably a no-op for the running
      stack. **Do not rebuild.**

      Done 2026-09-22, now at `fca9fce`. Confirmed after the fact:
      `git diff --stat eeac2a88..fca9fce -- infra/gateway/` is `CONTEXT.md`
      and `README.md` only, the four containers stayed `Up 3 days`, and
      production's `qcic-caddy:latest` kept its own image ID — distinct from
      gateway2's, so nothing was overwritten.

      Note this clone now carries `infra/gateway2/` in its working tree.
      Harmless *because* caddy no longer tags itself `qcic-caddy:latest`; a
      stray build here would produce `gateway2-caddy` and leave production's
      image alone.

      **"Do not rebuild" was overtaken the same day.** Production was rebuilt
      (`make build`, 572.8s) and redeployed (`make start`) at 18:34 — a
      deliberate call taken with observability in place, outside #293. So the
      "two doc files, a no-op" reasoning above describes how the clone got
      current, *not* the state of the running stack: `caddy`, `natsql` and
      `status` now run images built 2026-09-22, not the 2026-09-19 ones.
      All four came up with `restarts=0` and all public endpoints returned
      200. Cost, measured by the ted1k pump on d1-px1: 50 rows `MissingInB`
      across 18:33:31–18:34:20 — the restart window itself — fully self-healed
      on the next pump run.

      **Consequence for the steps below:** do not treat production as
      unchanged since February. Verify the running stack on its own terms
      before adding the `reverse_proxy` block.
- [ ] Land the Caddyfile change on `main` via its **own** commit/PR — separate
      from the gateway2 branch, since production's clone tracks `main` and this
      is the file production actually serves from. Then `git pull` on
      production picks it up.
- [ ] Add one block to `infra/gateway/config/caddy/Caddyfile`:

      health.qcic.dl.imetrical.com {
          reverse_proxy gateway2.imetrical.net:80
      }

      No `tls` block — the name resolves through the `*.dl` wildcard, so
      HTTP-01 works. Reload Caddy; do not rebuild the stack.
- [ ] Confirm `https://health.qcic.dl.imetrical.com/healthz` → 200
- [ ] **Add** `https://health.qcic.dl.imetrical.com/healthz` to Better Stack
- [ ] **Keep** both existing monitors (`natsql.dl…/health`,
      `scrobblecast.dl…/api/status`). `/healthz` observes NATS + Tailnet only
      and does not yet cover scrobblecast — swapping would drop coverage.

## Phase C — the restart experiment · #296

- [ ] De-cruft gateway2: remove `open-iscsi`, `multipath-tools`, `glances`,
      `cloud-init`; set `MODULES=dep`; rebuild initramfs
- [ ] 5 more restart samples, identical method to A5
- [ ] Compare against A5 — the initramfs stall varies 62s–110s for the same
      bug, so a single sample cannot distinguish improvement from noise
- [ ] Update `docs/research/synology-gateway-startup.md` with both sets

---

## Not in scope

Renaming `infra/gateway`'s own `qcic-caddy:latest` — gateway2's copy was
renamed to `gateway2-caddy` so the two stacks stop sharing an image tag, but
production keeps its name: gateway is what gateway2 eventually replaces, so
the tag gets retired with the host rather than fixed in place.

Cutover (router forward, `.dl.` names); `natsql`/`status` retirement;
migrating the four bus clients off the 2.7.3-beta server; `apps/web`; QCIC
notification publishing; adapting `pin-docker-tags.sh`; bumping the `nats` pin
2.14.4 → 2.15.0 in both compose files.

## Open risks

- ~~**Build OOM on 3.8 GiB.**~~ **Resolved 2026-09-22 — measured false.**
  Peak 742 MiB of 3911 MiB, and 4x the RAM on gateway bought only ~17% build
  time, so this is CPU/IO bound. No RAM bump was ever needed. Kept here
  because the rest of this entry still stands: the real fix is to stop building on a host tuned for
  operation, which needs *two* things that do not exist yet, not one:
  somewhere to put images (the OCI registry, a `PLANNED` line under
  `docker@galois` in the root README), **and** something that can emit
  `linux/amd64` — galois is arm64. Candidates for the second: `buildx` +
  QEMU on galois, GitHub Actions pushing to ghcr (half-started —
  `ghcr.io/daneroo/caddy:2-dns` 403s), or a real x86_64 host.
- **The `nats` digest pin is duplicated** in `v2/infra/compose.yaml` and
  `infra/gateway2/compose.yaml`, with nothing checking they agree. The sync
  rule is in `compose.yaml`'s header; it depends on someone reading it.
- **`health` watches an empty bus** until clients migrate — green means little
  at first.
- **`gateway2.imetrical.net` returns an RFC1918 address** over public DNS.
  Precedent is good: `gateway.imetrical.net` → `192.168.2.101` has resolved
  through the same path for years.
