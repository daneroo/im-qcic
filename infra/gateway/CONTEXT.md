# Gateway

An always-up Ubuntu VM (hosted on Syno) that terminates TLS and runs a small set of always-on services for the homelab.

## Language

**Gateway**:
The Ubuntu VM itself, reachable as `gateway.{ts}.imetrical.com`. Hosts Caddy, Nats, Natsql, and Status as docker-compose services (the file is named `docker-compose.yaml` for historical reasons, not the newer `compose.yaml` convention). Unlike Jellyfin's copy-by-hand deploy model, Gateway has this repo cloned directly and deploys from its own `infra/gateway/` via `make build` / `make start` (`docker compose build/up`) — the repo clone on Gateway **is** the live source, not a reference copy. Every context has its own deploy story; don't assume they match.
_Avoid_: the gateway VM, the server

**Note — build-context constraint for v2/status's Dockerfile (#227), confirmed**: `v2/` is a Bun workspace, so `status`'s Dockerfile build context must be the workspace root (`v2/`), not `v2/apps/status/` itself — `bun install` needs the root `package.json`/`bun.lock`/sibling packages to resolve workspace links. The Dockerfile still lives at `v2/apps/status/Dockerfile` (build with `-f apps/status/Dockerfile`, context `v2/`); Gateway's `docker-compose.yaml` `build:` field for `status` will need to change from a plain string to an object with separate `context`/`dockerfile` keys (standard Compose syntax, not Bun-specific). Locally validated (2026-08-02, Docker 29.5.3 / Compose v5.1.4 on Galois) with a throwaway scratch compose file — `docker compose config` resolves the paths correctly and `docker compose build` actually builds successfully with this shape. Not yet confirmed against Gateway's own Docker/Compose version specifically (SSH to Gateway wasn't reachable from within a Claude Code sandbox) — but since context+dockerfile as separate keys is long-standing, broadly-supported Compose syntax, this is a low-risk gap, not a blocker. An alternative, Docker BuildKit's "multiple build contexts" (`additional_contexts`, Compose ≥2.17), would let the Dockerfile's own context stay narrower instead — worth revisiting if Gateway's Compose version is confirmed current enough, but not needed for #227 to proceed.

**Caddy**:
The reverse proxy and TLS-termination service running on Gateway. Terminates certificates for `*.dl.imetrical.com` (HTTP challenge) and `*.imetrical.net` (Cloudflare DNS challenge), then proxies to backend services — including some outside this repo's inventory (e.g. `dirac.imetrical.com`, see Missing in the map).
_Avoid_: the proxy, the reverse proxy

**Nats**:
The NATS message broker running on Gateway, used for pub/sub messaging between homelab services.

**Natsql**:
A service built and run by Gateway; own vocabulary defined in `packages/natsql/CONTEXT.md`.

**Status**:
A service built and run by Gateway; own vocabulary defined in `packages/status/CONTEXT.md`.

**Better Stack** (formerly BetterUptime):
The external, third-party safety net — separate from and predating design/html-react's own dashboard. Does periodic HTTP health checks plus heartbeat monitoring, alarms via email/Slack, incident tracking. Publicly monitors two live endpoints, confirmed responding as of this inventory: `https://natsql.dl.imetrical.com/health` and `https://scrobblecast.dl.imetrical.com/api/status`. Until QCIC's own dashboard can be fully trusted, this is what's actually watching the watchers.
