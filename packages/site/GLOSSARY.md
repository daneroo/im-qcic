# Site

The main QCIC static site — a Gatsby build using the `gatsby-theme-document` theme, deployed to Vercel by hand (no CI/CD).

## Language

**Site**:
The Gatsby static site in this package. Live and actively used daily at `qcic.v.imetrical.com` (Vercel) — one of Daniel's most-used deployments in this repo. Not rebuilt/republished since 2022-03-01, but that's fine: it's static, so the lack of redeploys doesn't mean it's stale or unused.

**Site → Nats, Natsql**: Site connects directly to both Nats and Natsql (both running on Gateway) — Caddy reverse-proxies them out to the public internet so Site can reach them.

**Note — stale alias**: `vercel.json`'s `alias` field and `gatsby-config.js`'s `siteUrl` both still say `qcic.n.imetrical.com` — the old zeit/now-era domain (see the `.n.` DNS convention in the map), never updated when the Makefile's `web` target switched to `.v.` on 2022-02-28. This is latent since Site hasn't been redeployed since 2022; fix before the next deploy, or Vercel will alias to the wrong domain.

**Note — build risk, likely fatal**: Daniel's expectation (2026-08-02) is that Gatsby (this package) — like `packages/docz` (also Gatsby) and `packages/ui` (Next.js) — no longer builds on current Node.js at all. Not treating this as an in-place upgrade candidate; the working assumption for the next porting session is a rebuild on a modern framework, not a dependency bump. (Dependabot PR #214, an old unmerged Gatsby 2→4 bump, is probably moot for the same reason — worth a quick look before dismissing it outright, but don't expect it to be the fix.)
