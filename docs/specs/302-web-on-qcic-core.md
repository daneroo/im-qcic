# #302 — web on qcic-core (LAN and tailnet only)

Branch `302-web-on-qcic-core`. qcic-syno deploys from `main` only.

## Code

- [x] `src/endpoints.ts`: same-origin `/nats` and `/healthz`, env overrides win (tests)
- [x] `.env.development`: `bun dev` keeps localhost:9222 / :8000
- [x] `server.ts`: `start` serves `dist/client` (the SSR entry 404s assets), port 8000
- [x] `styles.css`: Tailwind scans `src/` only (Docker build had mismatched CSS hash)
- [x] `apps/web/Dockerfile`
- [x] qcic-core compose: `web` service; header delta 3
- [x] Caddyfile: `qcic{,.ts}.imetrical.net` block; DNS comment is CNAME pattern
- [x] `bun run ci` (175 pass)
- [x] /code-review: stale docs fixed. Port is 8000, not the spec's 3000 (ADR-0003)

## Checks (galois)

- [x] image: every `/assets` link 200, no `localhost` in bundle
- [x] `caddy validate` on the real Caddyfile
- [x] nats + web + caddy (http): `/`, `/network`, css 200; NATS pub/sub round-trip via `/nats`
- [x] `bun dev`: config resolves to localhost

## Deploy (after Daniel's go and merge)

- [ ] Cloudflare: `qcic.imetrical.net` CNAME `qcic-syno.imetrical.net`,
      `qcic.ts.imetrical.net` CNAME `qcic-syno.ts.imetrical.net` (DNS only) — Daniel
- [ ] qcic-syno: `git pull`, `just build`, `just start`
- [ ] Daniel: desktop (LAN) and phone (tailnet) show live data
