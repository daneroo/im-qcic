# Site

The main QCIC static site — a Gatsby build using the `gatsby-theme-document` theme, deployed to Vercel by hand (no CI/CD).

## Language

**Site**:
The Gatsby static site in this package. Live and actively used daily at `qcic.v.imetrical.com` (Vercel) — one of Daniel's most-used deployments in this repo. Not rebuilt/republished since 2022-03-01, but that's fine: it's static, so the lack of redeploys doesn't mean it's stale or unused.

**Site → Nats, Natsql**: Site connects directly to both Nats and Natsql (both running on Gateway) — Caddy reverse-proxies them out to the public internet so Site can reach them.

**Note — stale alias**: `vercel.json`'s `alias` field and `gatsby-config.js`'s `siteUrl` both still say `qcic.n.imetrical.com` — the old Netlify-era domain (see the `.n.` DNS convention in the map), never updated when Site moved to Vercel. This is latent since Site hasn't been redeployed since 2022; fix these before the next deploy, or Vercel will alias to the wrong domain.
