# Context Map

**Over the Fence**: this repo's inventory process. Every directory starts as "Unclassified" — on our side of the fence. As each one gets reviewed, it's thrown over to either **Live** (still relevant, gets its own `CONTEXT.md`) or **Deprecated** (no longer relevant, noted with a reason, no `CONTEXT.md`). Progress is visible as the Unclassified list shrinks.

## DNS subdomain convention (`*.imetrical.com`)

- **`.g.`** — Google Cloud (e.g. `myip.g.imetrical.com`, Cloudrun)
- **`.v.`** — Vercel (e.g. Site)
- **`.dl.`** — the homelab, as seen from outside; short for Daniel Lauzon's initials, not a per-provider tag like the others
- **`.ts.`** — Tailscale
- **`.n.`** — Netlify (see Cloud accounts)

## Cloud accounts

Cuts across almost every context above — worth tracking as its own axis rather than burying inside Missing.

- **AWS · iMetrical** (`daniel.lauzon@imetrical.com`) — needs a full key/resource inventory. Confirmed so far: profiles `im-dan` and `im-qcic-s3-rw` both see the same 3 S3 buckets (`im-weight`, `qcic.dev-alarms`, `qcic.production-alarms`); IAM users `daniel`, `fastai`, `im-weight-app`, `qcic-s3-rw`. `im-weight`/`im-weight-app` look unrelated to qcic (a separate weight-tracking project sharing the account). Includes decommissioning pubnub's S3 buckets once confirmed unused.
- **AWS · Personal** (`daniel.lauzon@gmail.com`) — used for Scrobblecast's S3 snapshots. Not yet inventoried.
- **GCP · iMetrical** (`daniel.lauzon@imetrical.com`) — several projects, including `qcic-237620` which runs Cloudrun's `myip` service (`myip.g.imetrical.com`). Other projects not yet inventoried.
- **GCP · Personal** (`daniel.lauzon@gmail.com`) — no known resources.
- **Cloudflare** — manages DNS for `*.imetrical.net` (Caddy's DNS-01 challenge uses a Cloudflare-scoped API token, see Gateway). Full account scope not yet inventoried.
- **Netlify** — implied by the `.n.` DNS convention; `packages/ui` was deployed there as `ui.qcic.n.imetrical.com` (now undeployed). Needs spelunking: what, if anything, is still actually deployed there, and whether the `*.n.imetrical.com` wildcard is still pointed at it.
- **Vercel** — hosts Site (`qcic.v.imetrical.com`). Account scope beyond Site not yet inventoried.

## Live contexts

(confirmed active — has its own CONTEXT.md)

- [Gateway](./infra/gateway/CONTEXT.md) — always-up Ubuntu VM hosting caddy, nats, natsql, status
- [Hass](./infra/hass/CONTEXT.md) — Home Assistant OS VM on Hilbert, controls TP-Link Kasa smart plugs
- [Jellyfin](./infra/jellyfin/CONTEXT.md) — media server: production on Syno, dev instance on Galois
- [Cloudrun](./cloudrun/CONTEXT.md) — deployed "myip" service on Google Cloud Run, at myip.g.imetrical.com
- [Site](./packages/site/CONTEXT.md) — Gatsby static site on Vercel, actively used daily, not rebuilt since 2022-03-01; config still has a leftover Netlify-era alias
- [Status](./packages/status/CONTEXT.md) — health-check service (tedcheck, logcheck), built and run by Gateway, slated for eventual retirement
- [Natsql](./packages/natsql/CONTEXT.md) — Daniel's own GraphQL-to-NATS subscription bridge; the repo's origin concept, built and run by Gateway
- [Mail](./mail/CONTEXT.md) — Mailgun notification experiment; content still wanted, slated to move under `scripts/`
- [Nats (client)](./nats/CONTEXT.md) — dev/test client for a NATS server; content still wanted, slated to move under `scripts/`

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

- **`events/`** — Serverless.com "Event Gateway"; the product itself is discontinued. Credentials referenced "shannon," tied to fully-dead tech, not worth tracking further.
- **`k8s/`** — abandoned early (2017-18) GKE cluster experiments; superseded by later, unrelated Talos/k3s thinking mentioned in `infra/gateway/README.md`.
- **`fio/`** — turned out to be from the same abandoned k8s-learning exercise (Kasten Learning lab, `kubestr`), not a standalone disk-benchmark utility.
- **`s3/`** — a one-time key-rotation experiment for pubnub's S3 usage; dies with pubnub. See the AWS gap below for the broader cleanup.
- **`pubnub/`** — "not in a functional state" per its own README; explicit delete. Still owns live AWS S3 buckets that need decommissioning (see AWS gap below) — deleting the directory doesn't finish this one.
- **`packages/ui`** — "garbage ancient next.js app" per README; was deployed to Netlify as `ui.qcic.n.imetrical.com` (now undeployed, confirmed via a Mailgun test-email link).
- **`packages/react`** — superseded reusable component library, explicit delete per README.

## Missing

(gaps surfaced during inventory — a real thing exists, but has no directory/CONTEXT.md yet)

- **Syno** — the Synology NAS host itself (runs the `Gateway` and `Pxbk` VMs, plus `Jellyfin` via Container Manager). No directory yet; candidate location `infra/syno/`.
- **Pxbk** — Proxmox Backup Server VM on Syno. No deployment record in this repo at all; origin/config unknown.
- **Dirac** — a host Caddy (on Gateway) proxies to (`dirac.imetrical.com:8000`, `:5000`). No deployment record in this repo at all.
- **Scrobblecast** — bigger than first thought: three copies run across the homelab, reverse-proxied by Caddy (`scrobblecast.dl.imetrical.com → dirac.imetrical.com:8000`) and checked for gaps by Status's `logcheck`. Snapshots to S3 under the Personal AWS account (see Cloud accounts). QCIC intends to actively track this one — credentials, S3 assets, and status/sync monitoring across the three copies — not just note it in passing. No source/deployment record in this repo yet.
- **Synk** — Syno's sibling, an offsite host mirroring many of Syno's volume shares. No directory yet; no deployment/config record in this repo.
- **Hilbert** — Daniel's biggest (aging) Proxmox VE server, ZFS-backed (`rpool`, `pve-storage` 6T pool with `backups-isos`/`vmstorage` datasets). Runs the Hass VM. No directory yet; no config/inventory record in this repo.
- **Galois** — Daniel's main machine, a Mac Mini M2 Pro. Mentioned in the README TODO for "local Staging/AppExperiments." No directory yet; role not fully pinned down.
- **Ted** — "The Energy Detective," Daniel's home power monitor. Source of the `watt` MySQL table that Status's `tedcheck` monitors for gaps (matches the "grafana-ted" commit history). No directory/deployment record in this repo — it's a physical device, not software.

## Unclassified

(not yet reviewed)

- `design/`
- `network/`
- `packages/cli`
- `packages/docz`
- `packages/gql-client`
- `packages/myip`
- `scripts/`
