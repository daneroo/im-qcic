# Public health at qcic.dl.imetrical.com/healthz; retire health.qcic.*

`qcic.dl.imetrical.com` (gateway) proxies `/healthz` only, over HTTPS, to
`qcic.imetrical.net` (qcic-syno). Everything else gets a static message. No
qcic-core change: the existing `qcic{,.ts}.imetrical.net` block routes
`/healthz`. DNS: `*.dl` wildcard (Hover), nothing to create.

## 1. Add qcic.dl

- [x] gateway Caddyfile: `qcic.dl.imetrical.com` block — Claude, #306
- [x] gateway: `git pull`, force-recreate caddy — Claude
- [x] `https://qcic.dl.imetrical.com/healthz` = `health.qcic.dl` JSON; `/` is the static message — Claude
      (valid cert, 200; `/network` gets the 74 B message; status.dl, natsql.dl still 200)

## 2. Switch Better Stack

- [x] monitor URL `health.qcic.dl.imetrical.com/healthz` → `qcic.dl.imetrical.com/healthz` — Daniel

## 3. Retire health.qcic.*

- [x] qcic-core Caddyfile: drop `health.qcic{,.ts}` and `http://health.qcic.dl` blocks — Claude, #307
- [x] gateway Caddyfile: drop `health.qcic.dl` block — Claude, same PR
- [x] docs: CONTEXT-MAP.md (Better Stack), Caddyfile comments — Claude, same PR
- [x] deploy both Caddys (force-recreate) — Claude, #307: qcic.dl, qcic{,.ts} /healthz 200;
      health.qcic.dl and health.qcic.ts no longer served
- [x] Cloudflare: delete `health.qcic{,.ts}.imetrical.net` — Daniel; NXDOMAIN (the `*` wildcard does not reach below the existing `qcic{,.ts}` names)
