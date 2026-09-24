# gateway2 rollout

Tracking file for standing up `gateway2` and finishing the Synology restart
diagnostics in [docs/research/synology-gateway-startup.md](../../docs/research/synology-gateway-startup.md).

**Governing rule: gateway2 is additive-only.** Nothing currently running
changes state. Phase A is _intended_ to touch no production machine at all —
it breached that once, on 2026-09-22, when unmasking docker resumed the stack
this VM inherited from its parent. See the trap note in A2; the rule stands,
but it is not self-enforcing.

`gateway2` is a transitory name — at least one more iteration of the
replacement server is expected, so nothing client-facing is named after the
host.

Check boxes as work lands. Record measurements inline under Phase A5 / C.

## Tickets

Spec: **#292**. Decisions and their reasoning live there; state lives here.

| Ticket   | Covers                  | Blocked by                              |
| -------- | ----------------------- | --------------------------------------- |
| **#293** | Phase A, sections A0–A4 | — · **done 2026-09-22**                 |
| **#294** | Phase A, section A5     | #293 · **done 2026-09-22**              |
| **#295** | Phase B                 | #293 · **done 2026-09-22**              |
| **#296** | Phase C, sections C1–C2 | #294 · **rescoped 2026-09-22 — see C0** |
| **#298** | Phase C, section C3     | — · **exploratory, not scheduled**      |

Phases 0, A and B are complete. Phase C was rescoped on 2026-09-22: its
original subject — de-crufting gateway2 to move the initramfs stall — does not
have the defect it proposed to fix (C0). It now covers an OS upgrade (C1) and
a decision about restarting the Synology itself (C2), which is where the
unmeasured time actually is. #297 —
`ted1k-derive` and `scast-bridge` dying permanently on restart — came out of
A5 and is open, unscheduled, and not tracked by this file.

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
      — validates the Caddyfile _including_ the cloudflare DNS plugin, without
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

- [x] `A  gateway2         192.168.2.138` — DNS-01 proof + Phase B upstream
- [x] `A  gateway2.ts      100.99.157.63` — DNS-01 proof, tailnet
- [x] `A  health.qcic      192.168.2.138` — direct to health, LAN
- [x] `A  health.qcic.ts   100.99.157.63` — direct to health, tailnet

Created 2026-09-22. All four verified against both `1.1.1.1` and `8.8.8.8`,
returning the addresses above rather than the zone's catch-all parking IP
`64.98.145.30` (which is what they returned before). Grey cloud needs no
separate check: Cloudflare cannot proxy RFC1918 or CGNAT, so an answer of
`192.168.2.138` / `100.99.157.63` is itself proof the records are DNS-only.

**Hover / `imetrical.com`: no changes.** Verified authoritatively —
`health.qcic.dl.imetrical.com` already resolves through the existing `*.dl`
wildcard CNAME → `syno-im.synology.me` → `142.170.38.42`.

Note: DNS-01 validation uses TXT records, so certificate _issuance_ does not
depend on these A records. They control reachability only.

### A2 · Prepare gateway2

**Trap — read before unmasking on any fresh clone.** gateway2 is a clone of
gateway, so `infra/gateway/` on it carries a complete _production_ stack whose
containers were created with `restart: unless-stopped`. The systemd mask was
the only thing holding them. Starting the daemon resumed all four
(`caddy`, `nats`, `natsql`, `status`) with no further command — a direct
breach of the additive-only rule.

What that cost on 2026-09-22, 17:32:50–17:34:44: `natsql` joined the
_production_ bus and republished heartbeats under the production identity
`natsql.dl.imetrical.com`. Nothing durable — `natsql` has no database path
(no `INSERT`/`REPLACE` in `packages/natsql/src`; it is a GraphQL↔NATS
bridge), `caddy` renewed only `localhost` from its local issuer and merely
read ARI for the public names, and `nats` restored the _clone's_ stale
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
      — these are uncommitted changes to _tracked_ files and will block the
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
      copied _locally on the VM_ from `infra/gateway/credentials/caddy/`, which
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
- [x] Sample 2
- [x] Sample 3
- [x] Sample 4
- [x] Sample 5

Per run collect: `systemd-analyze`, `systemd-analyze blame | head -20`,
`journalctl -b -k -o short-monotonic` (locate the initramfs stall), and
`docker inspect --format '{{.Name}} {{.State.StartedAt}}'` for all five.

Stated confounds: 3.8 GiB vs gateway's 15.6 GiB; five containers vs four;
Synology's concurrent load.

The stall is the silence between `Btrfs loaded` and
`EXT4-fs (dm-0): mounted filesystem` — the same two markers the research doc
uses for Event B's 110.03s. "Containers started" is the first and last of the
five `StartedAt` stamps, expressed as an offset from `uptime -s`.

| #   | kernel | userspace | stall      | containers started | notes                                                                                                          |
| --- | ------ | --------- | ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | 5.678s | 1m02.333s | **0.586s** | +37.5s → +39.7s    | boot 18:53:07Z; total 1m08.0s; `fsck` clean; `docker.service` 41.1s; all five `restarts=0`                     |
| 2   | 4.575s | 35.059s   | **0.709s** | +20.6s → +22.4s    | boot 18:57:19Z; total 39.6s; `fsck` clean; `docker.service` 27.4s; all five `restarts=0`                       |
| 3   | 4.460s | 36.123s   | **0.513s** | +20.2s → +21.7s    | boot 18:59:16Z; total 40.6s; `fsck` clean; `docker.service` 27.9s; all five `restarts=0`                       |
| 4   | 4.546s | 36.412s   | **0.518s** | +21.4s → +23.2s    | boot 19:01:11Z; total 41.0s; `fsck` clean; `docker.service` 27.7s; all five `restarts=0`                       |
| 5   | 4.843s | 36.570s   | **0.724s** | +20.8s → +23.0s    | boot 19:02:51Z; total 41.4s; `fsck` clean; `docker.service` 28.7s; all five `restarts=0`; `/healthz` 200 after |

All five taken 2026-09-22 18:53–19:03Z, back to back, via Synology VMM's
restart — graceful, so `fsck` reported `clean` every time, matching the
research doc's Event B rather than its power-cut Event A. Memory was
3911 MiB / 4 vCPU throughout; the VM was never resized (see A3).

**The five numbers.** Total 39.6s–68.0s. Kernel 4.46s–5.68s. Userspace
35.1s–62.3s. Stall slot 0.513s–0.724s. Containers first-to-last started at
+20.2s–+39.7s from `uptime -s`, the five always within 2.2s of each other.
No container restarted on any boot.

**Sample 1 is the outlier and has an identified reason.** It followed 2.5
days of uptime; its extra ~27s of userspace is concentrated in `udisks2`
(7.6s vs ~1.7s), `containerd` (7.9s vs ~0.8s) and `systemd-journal-flush`
(4.5s vs ~1.8s). Samples 2–5 were minutes apart and span 39.6s–41.4s total.
Both readings are kept: 1 is what a restart after a long uptime costs, 2–5
are what a restart after a recent one costs.

**Confounds, as #294 requires them stated.** gateway2 is 3.8 GiB against
production gateway's 15.6 GiB. It runs five containers where gateway runs
four, and they are not the same five. All five samples were taken inside a
ten-minute window, so they share one sample of the Synology's concurrent
load rather than five — the doc already measured that load moving userspace
by 53s, and this run cannot see that.

**No verdict here.** #294 defines no pass threshold and none would be
honest. The comparison is #296's.

**One observation that #296 needs, recorded as a question, not an answer.**
The stall slot held under a second on all five, yet gateway2 still carries
every condition the research doc names as the cause: `scripts/local-top/iscsi`
in the initramfs, `MODULES=most`, `multipathd` enabled, and
`systemd-detect-virt` → `microsoft`. Whatever gates the 62s–110s silence on
gateway, it is not the mere presence of that stack — so Phase C's de-cruft
cannot be evaluated against these five samples alone. Establishing that the
stall reproduces on gateway2 at all is step 3 of the research doc's proposed
experiment, and these five did not reproduce it.

**What the sampling did find: a startup race that leaves both workers dead.**
Not a boot-timing result, and it does not move any number in the table — but
it was found by taking five restarts, and it is why `restarts=0` in the notes
column must not be read as "healthy". The containers stay up; their run loops
do not.

Filed as **#297**, with the analysis below and a standing request to
re-derive it before implementing.

The two workers fail for _different_ reasons — an earlier version of this note
blamed `depends_on: nats` for both, which is wrong for `scast-bridge`.
`ted1k-derive` does race the local `nats-server`'s readiness (`depends_on`
orders container _start_, not readiness, and all five start within ~2s of each
other). `scast-bridge`'s `duplicate subscription` comes from the **production**
server: a reboot kills it without draining, so prod NATS still holds its
durable push consumer bound to a now-dead inbox. That tracks reboot recency,
not local nats timing. Neither recovers from losing:

| boot | nats started | ted1k-derive                           | scast-bridge                        |
| ---- | ------------ | -------------------------------------- | ----------------------------------- |
| 1    | 18:53:44.55  | +0.85s ok                              | +1.37s ok                           |
| 2    | 18:57:39.63  | +1.80s ok                              | +1.56s ok                           |
| 3    | 18:59:36.55  | +0.89s ok                              | +1.11s **`duplicate subscription`** |
| 4    | 19:01:33.92  | **−1.05s** **`getaddrinfo ENOTFOUND`** | −0.24s ok                           |
| 5    | 19:03:11.81  | +0.13s **`connection refused`**        | +1.54s **`duplicate subscription`** |

Two of five boots for each worker. On boot 4 `ted1k-derive` started _before_
`nats`, so the compose network alias did not yet resolve — hence `ENOTFOUND`
rather than a refused connection. That the two columns fail on _different_
boots is itself the evidence they are not one bug.

The failure is permanent, not transient. `ted1k-derive` retries its poll every
60s and was still logging `connection refused` at 19:06:23, more than three
minutes after boot, while `bash -c 'echo > /dev/tcp/nats/4222'` from _inside
that same container_ returned OPEN. It is holding a connection that failed at
startup, not re-dialing. `scast-bridge` is worse: it logs `run failed` once
and goes silent. Neither container exits, so `restart: unless-stopped` never
fires and `docker ps` shows five healthy-looking services.

Out of scope for #294 and deliberately not fixed here. The proposed fix in
#297 is _not_ a healthcheck: in a container `restart: unless-stopped` is
already the supervisor, and both apps defeat it — `scast-bridge` sets
`process.exitCode = 1` without exiting, and `ted1k-derive` catches every
error in its poll loop while holding a cached rejected `connect()` promise
that it re-awaits forever instead of re-dialing. Letting unrecoverable
startup failures be fatal makes both self-heal and makes `depends_on`
unnecessary. All four files are under `v2/apps/*`, shared with
`v2/infra/compose.yaml`, so this is not gateway2-specific.

It also bears on #295: `/healthz` observes NATS and the tailnet only, and
returned 200 throughout this episode. **Decided 2026-09-22 — it stays that
way for now.** `/healthz` does not cover worker liveness, and goes on Better
Stack as-is. So a green monitor attests to NATS and the tailnet, and to
nothing about `ted1k-derive` or `scast-bridge`; #297 is what makes those two
fail loudly instead of silently, and it is the fix, not the monitor.

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

- [x] Land the Caddyfile change on `main` via its **own** commit — separate
      from the gateway2 branch, since production's clone tracks `main` and this
      is the file production actually serves from. Then `git pull` on
      production picks it up.

      **Direct commit, no PR** (decided 2026-09-22). The criterion said
      "commit/PR"; its stated reason was separation from the gateway2 branch,
      and that branch merged as `bfd81dd3` (PR #291) before this ticket
      started — there is nothing left to be separate from. A PR also buys no
      test: the block can only be exercised by reloading production's Caddy,
      and production's clone tracks `main`, so a branch forces either a blind
      merge or an off-mainline checkout on production — the drift A2 had to
      unwind on gateway2.

      What protects the change instead: `caddy validate` run on production's
      own `qcic-caddy:latest` against the pulled file before reload; Caddy's
      reload is atomic, so a config that fails to load is rejected and the
      running one keeps serving. Rollback is `git revert` + pull + reload.

- [x] Add one block to `infra/gateway/config/caddy/Caddyfile`:

      health.qcic.dl.imetrical.com {
          reverse_proxy gateway2.imetrical.net:80
      }

      No `tls` block — the name resolves through the `*.dl` wildcard, so
      HTTP-01 works. Reload Caddy; do not rebuild the stack.

      Landed 2026-09-22 as `155a3eb3`, direct on `main`, and applied by
      recreating the caddy container — `docker compose up -d
      --force-recreate --no-deps caddy`. No image built; `nats`, `natsql`
      and `status` untouched.

- [x] Confirm `https://health.qcic.dl.imetrical.com/healthz` → 200

      Verified 2026-09-22 19:48Z from outside: 200, body reporting
      `"observer":"gateway2"`, on a freshly issued Let's Encrypt certificate
      (`CN=health.qcic.dl.imetrical.com`, issuer `YE2`, valid to
      2026-12-21) — so the wildcard, the forward, production's cert and the
      proxy hop all work as designed.

      Proven before the reload, not after: a request carrying
      `Host: health.qcic.dl.imetrical.com` to gateway2:80 returned 200, which
      is exactly what production sends — `reverse_proxy` preserves the
      client's `Host` by default. Controls on the same port confirm the
      matching is per-host: `health.qcic.imetrical.net` → 308 to HTTPS,
      an unmatched host → 308, this name → 200. Without the `http://` prefix
      the name would 308 too, and since Caddy passes upstream redirects
      through rather than following them, the client would loop between
      production and gateway2.

      Regression check after the recreate — all 200: `status.dl`,
      `natsql.dl/health`, `scrobblecast.dl/api/status`, `audiobook.dl`,
      `gateway.imetrical.net`.

- [x] **Add** `https://health.qcic.dl.imetrical.com/healthz` to Better Stack —
      as-is. It observes NATS and the tailnet only; worker liveness was
      considered and deliberately left out for now (2026-09-22, see A5).
- [x] **Keep** both existing monitors (`natsql.dl…/health`,
      `scrobblecast.dl…/api/status`). `/healthz` observes NATS + Tailnet only
      and does not yet cover scrobblecast — swapping would drop coverage.

      Done 2026-09-22 19:50Z. Better Stack now polls three, all `Up`, all at
      a 3m interval: the new `health.qcic.dl.imetrical.com/healthz`, plus
      `natsql.dl.imetrical.com/health` and
      `scrobblecast.dl.imetrical.com/api/status` — added alongside, not
      swapped, so no coverage was dropped.

      Remember what the green light means: NATS reachable and the tailnet
      reachable, as observed from gateway2. It says nothing about
      `ted1k-derive` or `scast-bridge`, which can be dead while this monitor
      stays green. #297 is what makes those fail loudly.

## Phase C — OS rebuild, and the restart question that is actually open · #296, #298

Phase C was originally "de-cruft gateway2 and re-measure." That is not
runnable, for the reason recorded below. What replaced it is two things: a
cheap OS upgrade on gateway2 (#296), and a decision about testing the
Synology itself — which is where the unmeasured time actually is.

### C0 · Why the original Phase C was dropped — verified, keep this

**#296 as originally written could not be run: its subject does not have the
defect it proposed to fix.** A5's five samples put gateway2's stall slot at
0.513s–0.724s, every sample. There is no 62s–110s silence on gateway2 to move.

Verified 2026-09-22 by direct read-only comparison of the two guests:

|                       | gateway (production)                                                         | gateway2              |
| --------------------- | ---------------------------------------------------------------------------- | --------------------- |
| kernel                | 5.15.0-191-generic                                                           | _identical_           |
| cmdline               | `root=/dev/mapper/ubuntu--vg-ubuntu--lv ro maybe-ubiquity`                   | _identical_           |
| disk                  | `SYNOLOGY Storage`, 200 G, `sda3` → LVM → `/`                                | _identical_           |
| `MODULES=`            | `most`                                                                       | _identical_           |
| initramfs             | `scripts/local-top/iscsi`, `iscsistart`, `be2iscsi`, `multipath.ko`, `hv_*`  | _identical_           |
| packages              | `open-iscsi`, `multipath-tools`, `cloud-init`, `cloud-initramfs-dyn-netconf` | _identical_           |
| `/etc/iscsi/nodes`    | **absent**                                                                   | **absent**            |
| `systemd-detect-virt` | `microsoft`                                                                  | _identical_           |
| swap / crypttab       | `/swap.img` 2 G, no `RESUME`, empty crypttab                                 | _identical_           |
| RAM                   | 15989 MiB                                                                    | 3911 MiB              |
| **stall**             | **62.2s** (`4.32s` → `66.55s`, boot of 2026-09-19)                           | **0.513–0.724s**, 5/5 |

Every condition the research doc named as the cause is present on both hosts in
identical form. One stalls; the other does not. **The named cause is falsified
as a sufficient explanation.** Note also that _neither_ host has an iSCSI node
database, so `local-top/iscsi` has no target to time out against on either
machine — that was assumed, never checked.

Two differentiators remain, neither of which de-crufting touches: host-side LUN
lineage (gateway's LUN is four years old, 140.6 GiB allocated, 11 snapshots),
and guest RAM (15.6 vs 3.8 GiB).

One methodological hole in the research doc, recorded here because it changes
how much the doc's central inference is worth: LVM activation in the initramfs
is **userspace** and emits nothing to the kernel ring buffer, so silence in
`journalctl -k` is not evidence of a timeout rather than slow work. And the
"slow storage — ruled out" row rests on a `drop_caches` test run on a **warm,
idle** Synology, which does not reproduce boot-time host conditions.

**De-cruft is therefore not scheduled.** On a VM that already boots in 40s it
is hygiene at best, and it carries a real risk — a rebuilt initramfs that does
not boot — against no measurable gain.

### C1 · Upgrade gateway2 to the current Ubuntu LTS · #296

`do-release-upgrade -c` on gateway2 returns **24.04.5 LTS** — one hop, not two.
`Prompt=lts` is already set; 26.04 is not offered.

Preflight, verified 2026-09-22: no held packages, `/boot` 259 MB of 1.5 GB,
`/` 15 GB of 195 GB, no pending reboot.

- [x] VMM snapshot of gateway2, taken **with the VM shut down** — see the
      snapshot note in C2. This is the whole rollback. Taken 2026-09-23
      ~02:11Z, labelled "cold, pre 24.04".
- [x] Pre-upgrade baseline, from the boot at 02:11:32Z: `ted1k-derive` lost
      the `nats` race (#297) and needed `docker compose restart ted1k-derive`;
      after that all five did real work — `ted1k-derive` publishing every
      view, `scast-bridge` copying the 02:10Z and 02:20Z generations.
- [x] `apt full-upgrade` on 22.04 first — `do-release-upgrade` refuses
      otherwise. 38 packages: kernel 5.15.0-191→194, Docker 29.2.1→29.8.1,
      containerd, tailscale. Rebooted 02:56:34Z. Incidental boot sample, not
      an A5 sample (first boot on a new kernel and a new dockerd):
      `8.763s (kernel) + 2min 18.838s (userspace)`; stall 4.035s; containers
      02:57:53.7–02:58:02.4 (+79–88s); NATS ready 02:58:10.35 (+96s).
      `docker.service` 2min 0.6s in blame — Docker cleaned up stale sandboxes,
      then took 36s to initialise buildkit after the containers were already
      up. This time `scast-bridge` lost the race (`duplicate subscription`)
      and `ted1k-derive` did not.
- [x] Better Stack: warned, not paused. It alerted to Slack on each reboot and
      on the Docker package restart, and recovered each time.
- [x] `sudo do-release-upgrade` — Daniel ran it, 2026-09-23 03:01Z; rebooted
      into 24.04.5 at 20:52:47Z. Unpack and configure took hours: IO pressure
      ("full") sat at 75–82% with ~300 KB/s written — dpkg syncs every file.
      Prompts worth knowing for the next clone: - **GRUB install device** — asked because the clone's disk id differs
      from Gateway's. Chose `/dev/sda` only. - **postfix** got pulled in and asked for a mail type;
      `postfix@-.service` now fails at boot and leaves systemd `degraded`.
      Port 25 is not listening. - **Remove obsolete packages: N** — Docker and Tailscale were `Foreign`
      with their sources off, so `y` would have removed them. - New SSH connections were refused mid-upgrade, and the fallback sshd on
      1022 reset them too. Only the open session and the VMM console worked.
- [x] Repoint third-party APT sources and reinstall. This time
      `do-release-upgrade` **renamed** `docker.list` and `tailscale.list` to
      `*.distUpgrade` rather than commenting them out; the old `focal`
      `tailscale.list.distUpgrade` was overwritten. Recreated both on `noble`,
      then `apt full-upgrade` (Docker packages to their noble builds, old
      5.15.0-190/191 kernels removed) and `apt autoremove` (151 packages,
      1.17 GB — compilers, python3 scientific stack, `python3.10`).
      `apt-cache policy` shows `docker-ce` and `tailscale` both from `noble`.
- [x] Verify: five containers up **and each doing real work, from its own
      logs** — not `docker ps`. Both workers came up dead after the reboot
      (`ted1k-derive` `connection refused`; `scast-bridge` `getaddrinfo
  ENOTFOUND`, a new #297 mode) and again after the Docker package restart.
      After `docker compose restart ted1k-derive scast-bridge` at 21:40Z:
      `ted1k-derive` published all three views, `scast-bridge` copied the
      21:30Z generation.
- [x] `/healthz` 200; tailnet identity still `gateway2`; LAN still
      `192.168.2.138`. Docker 29.8.1, Tailscale 1.102.4, kernel 6.8.0-142.
- [x] One set of restart samples by A5's method, recorded here. Secondary —
      22.04 already boots in 39.6s–41.4s and this ticket does not need an
      improvement to have succeeded. Say so plainly if nothing moves.

Samples on 24.04.5 (kernel 6.8.0-142), same method and columns as A5; VMM
restart, 2026-09-23.

| #   | kernel | userspace | stall      | containers started | notes                                                                                                                                                                                                                                                                     |
| --- | ------ | --------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 4.071s | 1m08.614s | **0.425s** | +34.5s → +36.1s    | boot 21:46:51Z; total 1m12.7s; `fsck` clean; `docker.service` 54.9s; NATS ready +38.9s; `ted1k-derive` published; `scast-bridge` restarts=6, last start +77.8s                                                                                                            |
| 2   | 3.725s | 41.736s   | **0.387s** | +22.3s → +24.3s    | boot 21:50:16Z; total 45.5s; `fsck` clean; `docker.service` 32.3s; NATS ready +25.9s; tailnet `Running` +15s; both workers did real work, all `restarts=0`                                                                                                                |
| 3   | 3.530s | 44.043s   | **0.352s** | +21.1s → +23.5s    | boot 21:53:24Z; total 47.6s; `fsck` clean; `docker.service` 34.9s; NATS ready +25.2s; tailnet `Running` +16s; `ted1k-derive` published; **`scast-bridge` dead** (`duplicate subscription`, #297)                                                                          |
| 4   | 3.614s | 40.480s   | **0.358s** | +23.5s → +25.5s    | **VMM shut down + start** — new QEMU process launched 21:56:29Z, guest kernel 21:56:35Z (**QEMU → kernel ~6s**, 1s resolution); total 44.1s; `fsck` clean; `docker.service` 31.1s; NATS ready +26.7s; tailnet `Running` +9s; both workers did real work, all `restarts=0` |
| 5   | 3.616s | 41.070s   | **0.396s** | +21.8s → +24.0s    | **VMM shut down + start** — QEMU 21:59:29Z, kernel 21:59:35Z (~6s); total 44.7s; `fsck` clean; `docker.service` 31.1s; NATS ready +25.4s; tailnet `Running` +14s; `ted1k-derive` published; **`scast-bridge` dead** (`duplicate subscription`)                            |

**Against 22.04 (A5 samples 2–5), nothing meaningful moved.** Samples 2–5
total 44.1–47.6s against 39.6–41.4s — about 5s slower, all in userspace
(`docker.service` 31–35s against 27–29s). The stall is 0.35–0.43s against
0.51–0.72s; containers start at +21–25s against +20–23s. Sample 1 is the
first boot after the upgrade and is excluded, as A5's sample 1 was.

**Shut down + start costs ~6s more than a restart**, all of it QEMU → guest
kernel; from the kernel on, samples 4–5 match 2–3. Event A's 24s for the
same stretch was a cold host with two VMs starting at once.

**#297 on 24.04:** `scast-bridge` came up dead in 2 of 5 (samples 3, 5,
`duplicate subscription`) and crash-looped until the tailnet was up in
sample 1; `ted1k-derive` was fine in all five.

**Tailscale is slow to come up on 24.04 — this matters the moment anything
in the critical chain depends on the tailnet.** Sample 1: `tailscaled`
started logging in at +14s and reached `Running` at **+76s**; the first
contact with the control plane alone took **60.3s**
(`control-netmap usec=60281249`) — a timeout signature, cause not yet
identified. Samples 2 and 3 reached the control plane in 84ms
(`cached=true`) and 834ms (`cached=false`) and were `Running` at +15s and
+16s — so the 60s is not every boot, and a cold cache alone does not cause
it. Sample 1 was the first boot after the release upgrade. Until then MagicDNS `gateway2` does not answer (SSH timed out);
`gateway2.imetrical.com` on the LAN did. Not measured on 22.04, so whether
this is new is unknown.

`scast-bridge` depends on it directly: its upstream is production NATS over
the tailnet (`100.120.49.100:4222`). On 24.04 it crashed with
`ECONNREFUSED` and was restarted by Docker six times until the tailnet was
up — a different #297 mode from the hangs seen on 22.04. The seventh start
got as far as mirroring the stream config; no `copied` was confirmed before
the next restart.

### C2 · The Synology restart — warm and cold · #296, decision first

**This is where the unmeasured time is.** Event A's only full-chain
measurement puts the Synology stage at **3m42s of 7m16s — 51%** — and the
research doc lists its internal 205s as "not decomposed." Nothing inside any
VM affects it. Five more VM restarts cannot see it.

**Prerequisite finding — the UPS does not do what it is assumed to do.**
Re-verified on syno 2026-09-22 21:05Z:

```text
/usr/syno/etc/ups/synoups.conf   17 bytes, mtime Jun 24 2021
upsc ups@localhost               Connection refused   (no UPS daemon running)
supportups="yes"                 DSM capability flag, not configuration
```

`supportups="yes"` only says DSM _can_ monitor a UPS. Nothing is listening.
So better UPS hardware changes the runtime, but **every power event is still a
hard cut** as far as DSM is concerned — which is exactly what Event A recorded
(`fsck … recovering journal`). Configuring UPS monitoring is a prerequisite for
the cold test to mean anything, and is arguably worth doing on its own merits
regardless of this ticket.

Also note: syno's uptime at the time of writing is 3 days — it has not rebooted
since the Event A power cut of 2026-09-19.

Two tests, very different costs:

**Warm — a graceful DSM reboot.** Decomposes the 205s and measures the
realistic recovery path. Cost: a controlled outage of _everything_ on the
Synology — production gateway, Pxbk/PBS, Container Manager workloads, shares.

**Cold — pull mains and let the UPS drive it.** Tests the whole safety chain
end to end, which is the thing actually worth knowing. Meaningless until UPS
monitoring is configured; without it this is just another hard cut.

- [x] **Decision from Daniel: warm, cold, both, or neither.** Nothing below
      happens without it. This is production; the risk is real and is his to
      accept. **Decided 2026-09-23: warm only.** Cold is out of scope for
      #296 — a hard cut triggers a full btrfs scrub (~18h). Revisit with the
      UPS setup, as its own ticket.
- [x] **Stated confound for the warm test:** VMM "Virtual machine priority"
      set 2026-09-23 before it — gateway **High**, gateway2 **Above normal**,
      Pxbk **Normal**. Event A ran with all at Normal. This is a relative
      weight under CPU _and I/O_ contention, not a boot order; VMM has no boot
      order or start delay, only Autostart (Yes / Last state / No).
- [ ] **Warm test, 2026-09-23 — DSM Shut Down hung and was forced off.**
      Timeline, from a 1s ping/SSH logger on galois:

      | Time (Z) | Event |
      | -------- | ----- |
      | ~22:20:00 | DSM Shut Down confirmed (VMM warns it waits ≤5 min for VMs) |
      | 22:21:04 | tailnet down |
      | 22:21:35 | SSH closed |
      | 22:22:06 | LAN down — power LED blinking blue from here on |
      | 23:34 | still blinking after **74 min**; forced off by holding the power button |

      No documented cause found (searched 2026-09-23).

      **Post-mortem.** `/proc/mdstat` on the next boot: `md2` `[5/5] [UUUUU]`,
      no resync. `/var/log/messages` shows DSM's own work finished in under
      two minutes (all times Z):

      | Time | Step |
      | ---- | ---- |
      | 22:20:20 | `synoccc_poweroff.sh: Start to shutdown guests` |
      | 22:21:02 | guests done — **42s** |
      | 22:21:03–45 | packages stopped; Container Manager share unmounts fail (`Fail to get share path` for five TM shares) |
      | 22:21:34 | iSCSI service stopped, target modules removed |
      | 22:21:50–52 | NVMe cache (`cachedev_0`) unloaded |
      | 22:21:52 | `space disassemble start`; `Swap state(Ready) is not None!` — **last line** |

      The last line proves nothing on its own: every shutdown in the log ends
      on the same two lines (2026-01-30, 03-20, 07-08, 08-23), and each of
      those was followed by the next boot 62–123s later. This one was
      followed by **74 minutes** of blinking. The hang is after syslog stops —
      volume/RAID teardown or the final power-off — and is invisible without
      a console.

      **Shutdown phases** (all Z; `messages`, `systemd.log`,
      `synosystemd.log`, plus the galois ping logger for the last row):

      | Phase | From → to | Took |
      | ----- | --------- | ---- |
      | Dialog shown (`Guests running 1`) → OK | 22:19:56 → 22:20:19 | 23s (human) |
      | VMM shuts down the three guests | 22:20:20 → 22:21:02 | **42s** |
      | Docker (Container Manager's `dockerd`) stops | 22:21:05 → 22:21:11 | 6s |
      | VMM's own stack (libvirtd, etcd, vhost modules) | 22:21:07 → 22:21:16 | 9s |
      | Container Manager package unit, incl. module removal | 22:21:02 → 22:21:33 | **31s** |
      | iSCSI, SMB, file services, network targets | 22:21:33 → 22:21:39 | 6s |
      | NVMe cache unload, volume teardown starts | 22:21:45 → 22:21:52 | 7s |
      | `Reached target Shutdown`; NormalShutdown touched; logger stops | 22:21:52 | — |
      | *unlogged* — still answering ping on the LAN | 22:21:52 → 22:22:06 | ≥14s |
      | *unlogged* — no network, LED blinking | 22:22:06 → 23:34 | **~72 min** |

      From OK to the last log line took **1m33s**. The host was still alive
      for at least 14s after that — it answered ping until 22:22:06 — so the
      final stage (remaining unmounts, RAID stop, power-off) was running
      when the network went. What it was doing for the next 72 minutes left
      no record.

      Narrowed further: `systemd.log` reaches `Reached target Shutdown` →
      `Touching NormalShutdown` → `Stopping System Logger Daemon` at 22:21:52Z,
      and the next boot's `syno-check-normal-shutdown` logged **`Normal
      Shutdown`**. So every DSM shutdown step completed. The two earlier
      shutdowns in `systemd.log` (07-08, 08-23) end on the same lines, so the
      logs cannot tell a hang from a clean power-off. `/sys/fs/pstore` is
      empty: no kernel panic recorded (assuming a pstore backend is active on
      this model, which is not verified). **The hang is in the
      kernel/firmware power-off, after DSM had finished — no trace survives.**
      **Second sample — DSM Restart, 2026-09-24 03:24Z.** No hang.

      | Phase | Time (Z) | Took | Shut-down run |
      | ----- | -------- | ---- | ------------- |
      | VMM shuts down the three guests | 03:24:37 → 03:25:06 | 29s | 42s |
      | Docker, Container Manager, VMM stack | 03:25:09 → 03:25:25 | 16s | ~31s |
      | iSCSI, network targets | → 03:25:33 | 8s | 6s |
      | cache unload, volume teardown, last log line | → 03:25:48 | 15s | 13s |
      | *unlogged*, still answering ping | → 03:26:00 | 12s | 14s |
      | *unlogged* → Synology kernel | → 03:26:17 | **17s** | **~72 min, forced** |

      Identical up to the unlogged final step; the reset path completed, the
      power-off path hung once. One sample of each.

      Boot after it (Synology kernel 03:26:17Z = t0):

      | Event | t+ | | Shut-down run |
      | ----- | -- | - | ------------- |
      | SSH open | 0:42 | | 0:42 |
      | `tailscaled` / VMM `etcd` | 1:16 / 1:19 | | 1:21 / 1:26 |
      | QEMU Pxbk, gateway, gateway2 | 2:56, 3:02, 3:13 | same order | 3:10, 3:19, 3:28 |
      | gateway kernel | 3:20 | | 3:34 |
      | **gateway NATS ready** | **6:35.3** | | 6:30.6 |
      | gateway2 NATS ready | 7:06 | both workers did real work | 6:54 |

      | | gateway | gateway2 |
      | - | - | - |
      | `systemd-analyze` | 18.1s + 3m48.8s = 4m06.9s | 41.3s + 3m25.2s = 4m06.4s |
      | stall | **2.18s** | 5.04s |
      | `docker.service` | 2m15.6s | 1m58.7s |

      Production outage, first guest shut down → gateway NATS ready:
      **8m15s**. gateway's stall was small again (2.2s, after 6.5s) — the
      62–110s stall has not reproduced on either Synology boot today.

      Side note: the next boot scheduled a data scrub for 2026-09-24 —
      assumed to be the regular ~26-day cycle, since the shutdown counted as
      normal.

      **The boot after it** — forced off at 23:34, powered on right after
      (button time not noted; Synology kernel is t=0). Priorities as above.

      | Time (Z) | t+ | Event |
      | -------- | -- | ----- |
      | 23:35:03 | 0 | Synology kernel boot |
      | 23:35:45 | 0:42 | SSH open |
      | 23:36:21–24 | 1:18–1:21 | tailnet up; `tailscaled` started |
      | 23:36:29 | 1:26 | VMM `etcd` |
      | 23:38:13 / :22 / :31 | 3:10 / 3:19 / 3:28 | QEMU: Pxbk, gateway, gateway2 — 9s apart, **not** in priority order |
      | 23:38:37 | 3:34 | gateway kernel (QEMU → kernel 15s) |
      | 23:38:54 | 3:51 | gateway2 kernel (QEMU → kernel 23s) |
      | 23:41:12–13 | 6:09–6:10 | gateway's four containers started |
      | 23:41:33.6 | **6:30.6** | **gateway NATS ready** |
      | 23:41:45–49 | 6:42–6:46 | gateway2's five containers started |
      | 23:41:57.2 | 6:54.2 | gateway2 NATS ready; both workers did real work |

      | | gateway | gateway2 |
      | - | - | - |
      | `systemd-analyze` | 17.0s + 3m32.5s = 3m49.6s | 20.2s + 3m19.9s = 3m40.0s |
      | stall | **6.49s** | 3.36s |
      | `docker.service` | 2m02.8s | 1m51.3s |
      | tailnet `Running` | 23:40:27 | 23:40:41 |
      | `fsck` | clean | clean |

      Against Event A: Synology kernel → QEMU 3:10 against 3:25 (14:17:49 →
      14:21:14); gateway QEMU → NATS ready 3m11.6s against 3m28s; Synology
      kernel → gateway NATS ready **6m30.6s against 6m59s**. **gateway's stall
      was 6.5s, not 62–110s** — the first time it has been small; one sample,
      with gateway on High priority, so the cause is not isolated. The time
      has moved into userspace instead: 3m32.5s, `docker.service` 2m02.8s.
      gateway2, which boots in ~45s alone, took 3m40s here — boot-time
      contention on the host dominates both guests.

      **The ted1k pipeline lost nothing across the outage.** Production NATS
      was down ~80 minutes (22:20 → 23:41Z). The next `pump` on d1-px1
      (00:12Z) verified MySQL on darwin against Postgres **before** copying:
      `Equal`, 863,332 rows over 10 days. The publisher's NATS client
      buffered through the outage and flushed on reconnect; the always-running
      subscriber on d1-px1 wrote the backlog into Postgres by itself. `pump`
      (the gap-filler) had nothing to do.
      **For the UPS work:** DSM's shutdown can't be relied on to finish, so
      its duration can't size the battery budget.

- [ ] ~~If cold: configure DSM UPS monitoring first, and confirm
      `upsc ups@localhost` answers.~~ Not in this ticket — see above.
- [ ] Maintenance window agreed; all **three** Better Stack monitors paused
      (`health.qcic.dl…/healthz`, `natsql.dl…/health`,
      `scrobblecast.dl…/api/status`).
- [ ] Method matches the research doc's Event A collection so the numbers are
      comparable: syno boot time and per-subsystem start, then the guest
      timeline. Commands are in the doc's Method section.
- [ ] Decompose the Synology stage — the 205s between kernel boot and VMM
      starting QEMU is the specific unknown.
- [ ] Record here and in the research doc; state plainly if it is inconclusive.

**Snapshot note that applies to everything in this phase.** VMM snapshots are
`isAppConsistence=no` — crash-consistent — even though `qemu-guest-agent` is
installed and active. A snapshot taken of a _running_ VM restores like a power
cut. Shut the VM down first and the rollback point boots clean.

### C3 · NixOS · #298

Separate ticket, exploratory, not scheduled. Options deliberately left open
there — in-place conversion, fresh install on the same VM, or a new VM
alongside. See #298.

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
  operation, which needs _two_ things that do not exist yet, not one:
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
