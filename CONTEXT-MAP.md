# Context Map

**Over the Fence**: this repo's inventory process. Every directory starts as "Unclassified" — on our side of the fence. As each one gets reviewed, it's thrown over to either **Live** (still relevant, gets its own `CONTEXT.md`) or **Deprecated** (no longer relevant, noted with a reason, no `CONTEXT.md`). Progress is visible as the Unclassified list shrinks.

## DNS subdomain convention (`*.imetrical.com`)

- **`.g.`** — Google Cloud (e.g. `myip.g.imetrical.com`, Cloudrun)
- **`.v.`** — Vercel (e.g. Site)
- **`.dl.`** — the homelab, as seen from outside; short for Daniel Lauzon's initials, not a per-provider tag like the others
- **`.ts.`** — Tailscale
- **`.n.`** — **not Netlify.** Leftover from **zeit/now** (`now.json`, v1/v2 configs) — "n" stood for "now," zeit's product name before it renamed to Vercel (~July 2020, when `now.json` files became `vercel.json`). Daniel picked the `.v.` suffix for the new Vercel custom domain around that same time. See Cloud accounts.

## Host naming convention

Physical/virtual hosts are named after mathematicians and scientists:

- **Galois** — Mac Mini M2 Pro, Daniel's main machine
- **Hilbert** — main Proxmox VE server (biggest, aging)
- **Euler** — secondary Proxmox server (temporary name, currently `px1`)
- **Dirac** — older host, formerly ran nats
- **Boole** — new UCG-Fiber router (see `network/UniFi-Journey-2025`)
- **Gauss** — btrfs mirror host (see Fio)
- **Davinci** — iMac M1
- **Darwin** — Mac Mini running Ubuntu
- **Goedel** — ancient MacBook
- **Fermat** — Mac Mini

Expect more of these to surface.

## Cloud accounts

Cuts across almost every context above — worth tracking as its own axis rather than burying inside Missing.

- **AWS · iMetrical** (`daniel.lauzon@imetrical.com`) — needs a full key/resource inventory. Confirmed so far: profiles `im-dan` and `im-qcic-s3-rw` both see the same 3 S3 buckets (`im-weight`, `qcic.dev-alarms`, `qcic.production-alarms`); IAM users `daniel`, `fastai`, `im-weight-app`, `qcic-s3-rw`. `im-weight`/`im-weight-app` look unrelated to qcic (a separate weight-tracking project sharing the account). Includes decommissioning pubnub's S3 buckets once confirmed unused.
- **AWS · Personal** (`daniel.lauzon@gmail.com`) — used for Scrobblecast's S3 snapshots. Not yet inventoried.
- **GCP · iMetrical** (`daniel.lauzon@imetrical.com`) — several projects, including `qcic-237620` which runs Cloudrun's `myip` service (`myip.g.imetrical.com`). Other projects not yet inventoried.
- **GCP · Personal** (`daniel.lauzon@gmail.com`) — no known resources.
- **Cloudflare** — manages DNS for `*.imetrical.net` (Caddy's DNS-01 challenge uses a Cloudflare-scoped API token, see Gateway). Full account scope not yet inventoried.
- **Netlify** — a real, active account ("Daniel Lauzon's team"), unrelated to the `.n.` DNS convention (that was zeit/now, not Netlify — see above). Confirmed via `netlify sites:list`: 4 sites, none tied to qcic and none using an `imetrical.com` custom domain — all on default `*.netlify.app` URLs: `wifidan`, `djembe-bolt` (has its own repo, `daneroo/djembe-bolt-astro-site`), `ir-logo` (`daneroo/ir-logo`), `helium-logo` (`daneroo/helium-logo`). `packages/ui` does have a `netlify.toml` with a site ID (`f0220657-...`) not in this current list — a genuine but now-gone Netlify deployment attempt, separate from its `.n.` zeit/now alias.
- **Zeit/now (defunct)** — the provider itself no longer exists; it rebranded to Vercel in 2020. Explains the `.n.` DNS convention and the `now.json` files found in `packages/{ui,docz,time}`. Nothing to inventory here beyond what's already noted — the provider is simply gone.
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
- [Design/html-react](./design/html-react/CONTEXT.md) — active UI prototype for the QCIC status dashboard (Heartbeat/Cast Synch/Ted1k cards)
- [Network/giga-router](./network/giga-router/CONTEXT.md) — DHCP/device extraction tool for the current Bell Giga Hub router
- [Network/UniFi-Journey-2025](./network/UniFi-Journey-2025/CONTEXT.md) — active 2025 migration to UniFi/UCG-Fiber, 10GbE backbone upgrade
- [Packages/myip](./packages/myip/CONTEXT.md) — undeployed rewrite meant to replace Cloudrun's "myip" service
- [Scripts](./scripts/CONTEXT.md) — active home for health-check/status-reporting script experiments; destination for Mail and Nats (client)
- [Fio](./fio/CONTEXT.md) — disk I/O characterization scripts, used to compare disk/filesystem performance across hosts

## Relationships

- **Gateway → Status, Natsql**: Gateway's `docker-compose.yaml` builds and runs these packages directly as services
- **Syno → Gateway, Pxbk**: Synology NAS host running these as VMs; also runs Jellyfin directly via Container Manager (not a VM)
- **Syno → Synk**: Synk is an offsite mirror of many of Syno's volume shares
- **Hilbert → Hass**: Hass runs as a Home Assistant OS VM on Hilbert (Proxmox VE)
- **Galois → Jellyfin (dev)**: a disposable local Jellyfin instance runs on Galois for development, reading the same media as the Syno production instance
- **Cloudrun ↔ Packages/myip**: same "myip" concept — Cloudrun is deployed and live, Packages/myip is an undeployed rewrite meant to replace it
- **Site → Nats, Natsql, Status**: Site connects directly to all three (all running on Gateway), reached publicly via Caddy's reverse proxy — Status acts as a router for internal checks, mostly for Site's consumption
- **Design/html-react → Natsql, Scrobblecast, Status/Ted**: the dashboard's three metric cards (Heartbeat, Cast Synch, Ted1k) render exactly these three things
- **Boole → Hilbert, Syno**: planned 10GbE SFP+ DAC connections as part of the UniFi migration; giga-router's Bell Giga Hub is what Boole (UCG-Fiber) replaces

## Deprecated / dead

(confirmed no longer relevant — reason noted, no CONTEXT.md)

- **`events/`** — Serverless.com "Event Gateway"; the product itself is discontinued. Credentials referenced "shannon," tied to fully-dead tech, not worth tracking further.
- **`k8s/`** — abandoned early (2017-18) GKE cluster experiments; superseded by later, unrelated Talos/k3s thinking mentioned in `infra/gateway/README.md`.
- **`s3/`** — a one-time key-rotation experiment for pubnub's S3 usage; dies with pubnub. See the AWS gap below for the broader cleanup.
- **`pubnub/`** — "not in a functional state" per its own README; explicit delete. Still owns live AWS S3 buckets that need decommissioning (see AWS gap below) — deleting the directory doesn't finish this one.
- **`packages/ui`** — "garbage ancient next.js app" per README; had a zeit/now alias `ui.qcic.n.imetrical.com` (confirmed via an old Mailgun test-email link, now undeployed) and separately a real but now-deleted Netlify site (`netlify.toml` site ID not in the current account).
- **`packages/react`** — superseded reusable component library, explicit delete per README.
- **`packages/cli`** — depends on `../api`, a package that no longer exists (renamed/merged into Natsql). Old Apollo Subscriptions CLI client, superseded.
- **`packages/docz`** — old zeit/now-era static status site (`docz.qcic.n.imetrical.com`), same purpose Design/html-react and Site now cover. Superseded.
- **`packages/gql-client`** — reusable Apollo client helpers; no live consumers remain (only the now-deprecated `ui`/`react` packages ever used it).
- **`packages/time`** — a trivial zeit/now serverless function returning the current time as JSON (`time.qcic.n.imetrical.com`). Uses the old `now` CLI, which no longer exists. No evidence of ongoing use beyond being a lambda smoke test.

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
- **Euler** — secondary Proxmox server (temporary name, currently `px1`). No directory/inventory record in this repo.
- **Davinci** — an iMac M1. No directory/inventory record in this repo.
- **Darwin** — a Mac Mini running Ubuntu. No directory/inventory record in this repo.
- **Goedel** — an ancient MacBook. No directory/inventory record in this repo.
- **Fermat** — a Mac Mini. No directory/inventory record in this repo.
- **Drobo** — an older NAS (Drobo 5N, `drobo.imetrical.com`), benchmarked in `backups/`'s restic/duplicacy investigation. Its own TODO suggests moving off Drobo onto Syno, but current status (still in use vs. retired) is unconfirmed.

## Unclassified

(not yet reviewed)

- `backups/` — a 2020-era backup-strategy investigation (restic vs duplicacy, benchmarked against a Drobo NAS). Its own TODO says to move the KubeVol experiment off Drobo onto Syno, but no resolution is recorded. Not classifying this one by guess — asked Daniel to confirm whether it's still live work or superseded by Synk.

Note: `.agents/`, `.claude/`, `.vscode/`, `docs/` are tooling/meta directories (this skill setup's own output, editor config) — intentionally out of scope for Over the Fence, not missed.

Two directories were found late and had slipped through the original scan entirely (not just misjudged, actually absent from the list): `packages/time` (now classified, see Deprecated) and `backups/` (above). Worth a systematic `find`-based re-check like this one before calling any future pass "complete."
