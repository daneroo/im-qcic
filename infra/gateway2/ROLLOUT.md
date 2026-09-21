# gateway2 rollout

Tracking file for standing up `gateway2` and finishing the Synology restart
diagnostics in [docs/research/synology-gateway-startup.md](../../docs/research/synology-gateway-startup.md).

**Governing rule: gateway2 is additive-only.** Nothing currently running
changes state. Phase A touches no production machine at all.

`gateway2` is a transitory name — at least one more iteration of the
replacement server is expected, so nothing client-facing is named after the
host.

Check boxes as work lands. Record measurements inline under Phase A5 / C.

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

## Phase A — stand up gateway2 (additive-only)

### A0 · Build-only smoke test on galois

Catches path/syntax errors before touching the VM. **Build only — do not
start.** Galois is arm64 and gateway2 is x86_64, so these images are not
deployable; this does not tell you whether the build fits in 3.8 GiB.

- [ ] `just build`
- [ ] `docker run --rm -v "$PWD/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" qcic-caddy:latest caddy validate --config /etc/caddy/Caddyfile`
      — validates the Caddyfile *including* the cloudflare DNS plugin, without
      starting anything or contacting an ACME server

### A1 · DNS — Cloudflare only, zone `imetrical.net`

All four **DNS only (grey cloud)**. Cloudflare cannot proxy RFC1918 or CGNAT
addresses, and proxying would break both names.

- [ ] `A  gateway2         192.168.2.138`  — DNS-01 proof + Phase B upstream
- [ ] `A  gateway2.ts      100.99.157.63`  — DNS-01 proof, tailnet
- [ ] `A  health.qcic      192.168.2.138`  — direct to health, LAN
- [ ] `A  health.qcic.ts   100.99.157.63`  — direct to health, tailnet

**Hover / `imetrical.com`: no changes.** Verified authoritatively —
`health.qcic.dl.imetrical.com` already resolves through the existing `*.dl`
wildcard CNAME → `syno-im.synology.me` → `142.170.38.42`.

Note: DNS-01 validation uses TXT records, so certificate *issuance* does not
depend on these A records. They control reachability only.

### A2 · Prepare gateway2

- [ ] `sudo systemctl unmask docker && sudo systemctl enable --now docker`
      (currently masked, as deliberate deconfliction)
- [ ] Revert the clone's hand-edits to `infra/gateway/{config/caddy/Caddyfile,docker-compose.yaml}`
- [ ] Delete `infra/gateway/*.gateway2-original` (2 files)
- [ ] `git pull`
- [ ] Copy in `credentials/caddy/CREDS.env` (existing `CF_API_TOKEN`)
- [ ] Copy in `credentials/credentials.mysql.json` (ted1k-derive)
- [ ] Copy in `credentials/credentials.nats-prod.json` (scast-bridge)

### A3 · Build and start

- [ ] Optionally raise RAM above 3.8 GiB for the build — `xcaddy` and the Bun
      builds are the hungry ones. No cross-build escape hatch exists: galois is
      arm64, and `ghcr.io/daneroo/caddy:2-dns` returns 403 (never shipped).
- [ ] `just build`
- [ ] `just start`
- [ ] **Drop RAM back to 3.8 GiB before measuring**

### A4 · Verify

- [ ] `https://gateway2.ts.imetrical.net` → "Hello, gateway2!" (DNS-01 works)
- [ ] `https://gateway2.imetrical.net` → same, over LAN
- [ ] `https://health.qcic.ts.imetrical.net/healthz` → 200
- [ ] `just status` → 5 containers up
- [ ] `docker compose logs nats` → healthy
- [ ] `docker compose logs scast-bridge` → reading production's `scrobblecastDigest`
- [ ] `docker compose logs ted1k-derive` → polling Darwin's MySQL

### A5 · Baseline restart samples — with-workload baseline

VMM restarts are graceful, so these compare to the doc's Event B (3m16s).

- [ ] Sample 1
- [ ] Sample 2
- [ ] Sample 3
- [ ] Sample 4
- [ ] Sample 5

Per run collect: `systemd-analyze`, `systemd-analyze blame | head -20`,
`journalctl -b -k -o short-monotonic` (locate the initramfs stall), and
`docker inspect --format '{{.Name}} {{.State.StartedAt}}'` for all five.

Stated confounds: 3.8 GiB vs gateway's 15.6 GiB; five containers vs four;
Synology's concurrent load.

| # | kernel | userspace | stall | containers started | notes |
| - | ------ | --------- | ----- | ------------------ | ----- |
|   |        |           |       |                    |       |

## Phase B — expose health publicly (touches production)

- [ ] `git pull` on **production gateway's** clone first. It is 91 commits
      behind at `eeac2a88` (2026-02-24) and has never fetched; the delta under
      `infra/gateway/` is two doc files — verifiably a no-op for the running
      stack. **Do not rebuild.**
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

## Phase C — the restart experiment

- [ ] De-cruft gateway2: remove `open-iscsi`, `multipath-tools`, `glances`,
      `cloud-init`; set `MODULES=dep`; rebuild initramfs
- [ ] 5 more restart samples, identical method to A5
- [ ] Compare against A5 — the initramfs stall varies 62s–110s for the same
      bug, so a single sample cannot distinguish improvement from noise
- [ ] Update `docs/research/synology-gateway-startup.md` with both sets

---

## Not in scope

Cutover (router forward, `.dl.` names); `natsql`/`status` retirement;
migrating the four bus clients off the 2.7.3-beta server; `apps/web`; QCIC
notification publishing; adapting `pin-docker-tags.sh`; bumping the `nats` pin
2.14.4 → 2.15.0 in both compose files.

## Open risks

- **Build OOM on 3.8 GiB.** Mitigated by a temporary RAM bump; no cross-build
  escape hatch.
- **The `nats` digest pin is duplicated** in `v2/infra/compose.yaml` and
  `infra/gateway2/compose.yaml`, with nothing checking they agree. The sync
  rule is in `compose.yaml`'s header; it depends on someone reading it.
- **`health` watches an empty bus** until clients migrate — green means little
  at first.
- **`gateway2.imetrical.net` returns an RFC1918 address** over public DNS.
  Precedent is good: `gateway.imetrical.net` → `192.168.2.101` has resolved
  through the same path for years.
