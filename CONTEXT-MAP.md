# Context Map

**Over the Fence**: this repo's inventory process. Every directory starts as "Unclassified" — on our side of the fence. As each one gets reviewed, it's thrown over to either **Live** (still relevant, gets its own `CONTEXT.md`) or **Deprecated** (no longer relevant, noted with a reason, no `CONTEXT.md`). Progress is visible as the Unclassified list shrinks.

## Live contexts

(confirmed active — has its own CONTEXT.md)

- [Gateway](./infra/gateway/CONTEXT.md) — always-up Ubuntu VM hosting caddy, nats, natsql, status
- [Hass](./infra/hass/CONTEXT.md) — Home Assistant home-automation deployment
- [Jellyfin](./infra/jellyfin/CONTEXT.md) — media server deployment
- [Cloudrun](./cloudrun/CONTEXT.md) — Google Cloud Run service, deployed at myip.g.imetrical.com
- [Site](./packages/site/CONTEXT.md) — Gatsby static site, deployed to Vercel (manual, stale since 2022-03-01)
- [Status](./packages/status/CONTEXT.md) — status service, built and run by Gateway
- [Natsql](./packages/natsql/CONTEXT.md) — natsql service, built and run by Gateway

## Relationships

- **Gateway → Status, Natsql**: Gateway's `docker-compose.yaml` builds and runs these packages directly as services
- **Syno → Gateway, Pxbk**: Synology NAS host running these as VMs; also runs Jellyfin directly via Container Manager (not a VM)

## Deprecated / dead

(confirmed no longer relevant — reason noted, no CONTEXT.md)

## Missing

(gaps surfaced during inventory — a real thing exists, but has no directory/CONTEXT.md yet)

- **Syno** — the Synology NAS host itself (runs the `Gateway` and `Pxbk` VMs, plus `Jellyfin` via Container Manager). No directory yet; candidate location `infra/syno/`.
- **Pxbk** — Proxmox Backup Server VM on Syno. No deployment record in this repo at all; origin/config unknown.

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
