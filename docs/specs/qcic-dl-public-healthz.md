# Public health at qcic.dl.imetrical.com/healthz; retire health.qcic.*

`qcic.dl.imetrical.com` (gateway) proxies `/healthz` only, over HTTPS, to
`qcic.imetrical.net` (qcic-syno). Everything else gets a static message. No
qcic-core change: the existing `qcic{,.ts}.imetrical.net` block routes
`/healthz`. DNS: `*.dl` wildcard (Hover), nothing to create.

## 1. Add qcic.dl

- [ ] gateway Caddyfile: `qcic.dl.imetrical.com` block — Claude, PR
- [ ] gateway: `git pull`, force-recreate caddy — Claude
- [ ] `https://qcic.dl.imetrical.com/healthz` = `health.qcic.dl` JSON; `/` is the static message — Claude

## 2. Switch Better Stack

- [ ] monitor URL `health.qcic.dl.imetrical.com/healthz` → `qcic.dl.imetrical.com/healthz` — Daniel

## 3. Retire health.qcic.*

- [ ] qcic-core Caddyfile: drop `health.qcic{,.ts}` and `http://health.qcic.dl` blocks — Claude, PR
- [ ] gateway Caddyfile: drop `health.qcic.dl` block — Claude, same PR
- [ ] docs: CONTEXT-MAP.md (Better Stack), Caddyfile comments — Claude, same PR
- [ ] deploy both Caddys (force-recreate) — Claude
- [ ] Cloudflare: delete `health.qcic{,.ts}.imetrical.net` — Daniel
