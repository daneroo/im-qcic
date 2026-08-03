# @daneroo/qcic-status

Health-check API for the homelab (`tedcheck`, `logcheck`) — a faithful,
behavior-frozen port of the repo root's `packages/status` onto Bun/Hono/TS. See
[../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions and
[docs/adr](../../../docs/adr/) for why this exists.

Not yet wired into `infra/gateway`'s real deploy — see
[../../../packages/status/CONTEXT.md](../../../packages/status/CONTEXT.md) for
cutover status.

## Local dev

```sh
cd v2/apps/status
bun install
PORT=8098 bun run dev
```

`tedcheck`/`logcheck` need real credentials to return real data — without them,
those two endpoints log a warning and respond `500`, which is expected, not
broken. Two gitignored files are needed at the workspace-root `v2/credentials/`
(see [../../AGENTS.md](../../AGENTS.md)): `credentials.mysql.json` and
`credentials.loggly.json`.

## Docker

Build context is the **workspace root** (`v2/`), not this directory:

```sh
cd v2
docker build -f apps/status/Dockerfile -t qcic-status:latest .
```

Run it, with the same two credential files mounted (see the Dockerfile's own
comment for why the container-side path is `/usr/src/app/credentials/`):

```sh
docker run -d --name qcic-status -p 8000:8000 \
  -v "$(pwd)/credentials/credentials.mysql.json:/usr/src/app/credentials/credentials.mysql.json:ro" \
  -v "$(pwd)/credentials/credentials.loggly.json:/usr/src/app/credentials/credentials.loggly.json:ro" \
  qcic-status:latest
```

Verify:

```sh
curl localhost:8000/
curl localhost:8000/api/version
curl localhost:8000/api/tedcheck
curl localhost:8000/api/logcheck
```

Stop it — `docker stop` should produce a clean shutdown logged within
milliseconds, not a multi-second hang:

```sh
docker stop qcic-status && docker rm qcic-status
```
