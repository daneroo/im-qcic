# Status

A fastify service acting as a router for internal homelab health checks, consumed mostly by Site. Built and run by Gateway, publicly reverse-proxied by Caddy at `status.dl.imetrical.com`. Its own compose entry flags it as legacy, expected to be retired once replaced by live monitoring services (hasura/ipfs) — active, but not core.

## Language

**Tedcheck**:
Checks a MySQL `watt` table for missing samples, at day/week/hour granularity. The `watt` readings come from **Ted** (see Missing) — Daniel's home power monitor ("The Energy Detective").

**Logcheck**:
Checks Scrobblecast digest logs (see Missing) for gaps.

**Note — build risk**: deployed via Gateway's docker-compose (`build: ../../packages/status/`), so the risk is less "does it run on my current Node" and more "does its Dockerfile's pinned base image still build" — unverified. Worth checking before any migration to a new monorepo structure.
