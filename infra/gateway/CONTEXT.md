# Gateway

An always-up Ubuntu VM (hosted on Syno) that terminates TLS and runs a small set of always-on services for the homelab.

## Language

**Gateway**:
The Ubuntu VM itself, reachable as `gateway.{ts}.imetrical.com`. Hosts Caddy, Nats, Natsql, and Status as docker-compose services.
_Avoid_: the gateway VM, the server

**Caddy**:
The reverse proxy and TLS-termination service running on Gateway. Terminates certificates for `*.dl.imetrical.com` (HTTP challenge) and `*.imetrical.net` (Cloudflare DNS challenge), then proxies to backend services — including some outside this repo's inventory (e.g. `dirac.imetrical.com`, see Missing in the map).
_Avoid_: the proxy, the reverse proxy

**Nats**:
The NATS message broker running on Gateway, used for pub/sub messaging between homelab services.

**Natsql**:
A service built and run by Gateway; own vocabulary defined in `packages/natsql/CONTEXT.md`.

**Status**:
A service built and run by Gateway; own vocabulary defined in `packages/status/CONTEXT.md`.
