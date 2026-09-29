# #315 — Gateway NATS: upgrade to 2.15.0

On `main`. Gateway deploys from its own clone: `~/Code/iMetrical/im-qcic/infra/gateway`.
Same image, config mount and data mount as `infra/qcic-core`. Clients unchanged (#313).

Data layout moves from `data/nats/jetstream/jetstream/$G` (old nested mount) to
`data/nats/jetstream/$G` (qcic-core's layout).

## Code (galois)

- [x] compose: image `nats:2-alpine@sha256:ac8f88a6494bffc2c2a5289a0ca61cb28a9145c11ba5677cf24265d07f46d8d4` (2.15.0)
- [x] compose: config → `/etc/nats/nats-server.conf`, data `./data/nats:/data`
- [x] `nats-server.conf`: `store_dir: /data`
- [x] local run (docker, tmp dir): pinned server on old layout + stream with 3 msgs → `mv $G` → 2.15.0 on new mounts: stream kept (3 msgs), JetStream at `/data/jetstream`, websocket 9222 answers
- [x] commit, push `main`

## Pre-rollout (gateway)

- [x] rollback commit: `1b665c91` (`v1.0.50-195-g1b665c9`), pulled + `make build` + `make start`, all images cached, nothing recreated — Daniel
- [x] backup: `sudo tar -czf ~/gateway-data-pre-315.tgz data` (in `infra/gateway`), `tar -d` clean, sha256 `693e949c…a439` — Daniel

## Rollout (gateway)

- [x] `docker compose stop nats` — agent
- [x] `sudo mv 'data/nats/jetstream/jetstream/$G' data/nats/jetstream/ && sudo rmdir data/nats/jetstream/jetstream` — Daniel
- [x] `git pull`, `docker compose up -d --force-recreate nats` — agent (first up hung on image pull; container left "Created", started with `up -d`; name now `8bfcd30f4390_gateway-nats-1`)

## Checks

- [x] `/varz`: 2.15.0, websocket 9222, JetStream store `/data/jetstream`
- [x] `/connz`: capture.ted1k, subscribe.ted1k, natsql, scrobblecast ×3, scast-bridge-qcic-syno
- [x] `watts: N` on `im.qcic.heartbeat`
- [x] `scrobblecastDigest`: old messages kept, new digest arrives — 858 kept, both consumers kept; new digest 04:13
- [x] `natsql.dl.imetrical.com/health` green
- [x] close #313 and #315

## Rollback (gateway), if a check fails

- [ ] `docker compose stop nats` — agent
- [ ] `cd ~/Code/iMetrical/im-qcic/infra/gateway && sudo rm -rf data/nats && sudo tar -xzf ~/gateway-data-pre-315.tgz data/nats` (practice restore to /tmp verified) — Daniel
- [ ] `git checkout 1b665c91`, `docker compose up -d --force-recreate nats` — agent
- [ ] assess; revert on `main` here

## Result

- Dark 03:59–04:09 UTC. Pump (postgres) missed 533 samples, caught up from MySQL. No data lost.
- Leftover: container named `8bfcd30f4390_gateway-nats-1`; next `--force-recreate nats` fixes it.
