# Context Map

**Over the Fence**: this repo's inventory process. Every directory starts as "Unclassified" — on our side of the fence. As each one gets reviewed, it's thrown over to either **Live** (still relevant, gets its own `CONTEXT.md`) or **Deprecated** (no longer relevant, noted with a reason, no `CONTEXT.md`). Progress is visible as the Unclassified list shrinks.

## DNS subdomain convention (`*.imetrical.com`)

- **`.g.`** — Google Cloud (e.g. `myip.g.imetrical.com`, Cloudrun)
- **`.v.`** — Vercel (e.g. Site)
- **`.dl.`** — the homelab, as seen from outside; short for Daniel Lauzon's initials, not a per-provider tag like the others
- **`.ts.`** — Tailscale
- **`.n.`** — Netlify; stale, from the zeit/now → Netlify migration lineage — needs spelunking to find out what, if anything, is still actually deployed there (see Missing)

## Live contexts

(confirmed active — has its own CONTEXT.md)

- [Gateway](./infra/gateway/CONTEXT.md) — always-up Ubuntu VM hosting caddy, nats, natsql, status
- [Hass](./infra/hass/CONTEXT.md) — Home Assistant OS VM on Hilbert, controls TP-Link Kasa smart plugs
- [Jellyfin](./infra/jellyfin/CONTEXT.md) — media server: production on Syno, dev instance on Galois
- [Cloudrun](./cloudrun/CONTEXT.md) — deployed "myip" service on Google Cloud Run, at myip.g.imetrical.com
- [Site](./packages/site/CONTEXT.md) — Gatsby static site on Vercel, actively used daily, not rebuilt since 2022-03-01; config still has a leftover Netlify-era alias
- [Status](./packages/status/CONTEXT.md) — health-check service (tedcheck, logcheck), built and run by Gateway, slated for eventual retirement
- [Natsql](./packages/natsql/CONTEXT.md) — Daniel's own GraphQL-to-NATS subscription bridge; the repo's origin concept, built and run by Gateway

## Relationships

- **Gateway → Status, Natsql**: Gateway's `docker-compose.yaml` builds and runs these packages directly as services
- **Syno → Gateway, Pxbk**: Synology NAS host running these as VMs; also runs Jellyfin directly via Container Manager (not a VM)
- **Syno → Synk**: Synk is an offsite mirror of many of Syno's volume shares
- **Hilbert → Hass**: Hass runs as a Home Assistant OS VM on Hilbert (Proxmox VE)
- **Galois → Jellyfin (dev)**: a disposable local Jellyfin instance runs on Galois for development, reading the same media as the Syno production instance
- **Cloudrun ↔ packages/myip**: same "myip" concept — Cloudrun is deployed and live, `packages/myip` is an undeployed rewrite meant to replace it (still Unclassified)
- **Site → Nats, Natsql, Status**: Site connects directly to all three (all running on Gateway), reached publicly via Caddy's reverse proxy — Status acts as a router for internal checks, mostly for Site's consumption

## Deprecated / dead

(confirmed no longer relevant — reason noted, no CONTEXT.md)

## Missing

(gaps surfaced during inventory — a real thing exists, but has no directory/CONTEXT.md yet)

- **Syno** — the Synology NAS host itself (runs the `Gateway` and `Pxbk` VMs, plus `Jellyfin` via Container Manager). No directory yet; candidate location `infra/syno/`.
- **Pxbk** — Proxmox Backup Server VM on Syno. No deployment record in this repo at all; origin/config unknown.
- **Dirac** — a host Caddy (on Gateway) proxies to (`dirac.imetrical.com:8000`, `:5000`). No deployment record in this repo at all.
- **Scrobblecast** — a service reverse-proxied by Caddy (`scrobblecast.dl.imetrical.com → dirac.imetrical.com:8000`), consumed by Status's `logcheck`. No source/deployment record in this repo.
- **Synk** — Syno's sibling, an offsite host mirroring many of Syno's volume shares. No directory yet; no deployment/config record in this repo.
- **Hilbert** — Daniel's biggest (aging) Proxmox VE server, ZFS-backed (`rpool`, `pve-storage` 6T pool with `backups-isos`/`vmstorage` datasets). Runs the Hass VM. No directory yet; no config/inventory record in this repo.
- **Galois** — Daniel's main machine, a Mac Mini M2 Pro. Mentioned in the README TODO for "local Staging/AppExperiments." No directory yet; role not fully pinned down.
- **Netlify** — account/deployments implied by the `.n.` DNS convention and the zeit/now → Netlify migration lineage in old TODOs. Needs spelunking: what's actually still deployed there, if anything, is unknown.
- **Ted** — "The Energy Detective," Daniel's home power monitor. Source of the `watt` MySQL table that Status's `tedcheck` monitors for gaps (matches the "grafana-ted" commit history). No directory/deployment record in this repo — it's a physical device, not software.

## Unclassified

(not yet reviewed)

- `design/`
- `events/`
- `fio/`
- `k8s/`
- `mail/`
- `nats/`
- `network/`
- `packages/cli`
- `packages/docz`
- `packages/gql-client`
- `packages/myip`
- `packages/react`
- `packages/ui`
- `pubnub/`
- `s3/`
- `scripts/`
