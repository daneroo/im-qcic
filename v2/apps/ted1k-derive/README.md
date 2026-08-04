# @daneroo/qcic-ted1k-derive

Polls Ted1k's MySQL `watt` table on the same 60s cadence `site` used to poll
`/api/tedcheck` at, and publishes the result to a NATS KV bucket on the new
`v2/infra` NATS server — replacing the HTTP request/response cycle with a push.
See [../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions.

Reuses `v2/apps/status/src/tedcheck.ts` (queries, `asTable`, `iso8601ify`) and
`tedcheck-datasource.ts` (`createMysqlDataSource`, including the
`decodeDecimalBuffers` Bun.SQL DECIMAL fix) unchanged — this service never talks
to the production NATS server, only MySQL as input and the new NATS server as
output.

Published shape matches today's `/api/tedcheck` `{meta, data}` response exactly,
under bucket `ted1k-derive`, key `tedcheck`.

**Future refinements, deliberately deferred** (see
[issue #237](https://github.com/daneroo/im-qcic/issues/237)'s discussion):
fetch-on-demand instead of/alongside periodic push, splitting the payload into
per-query keys, and incremental (diff-only) updates for the
`missingWeekByDay`/`missingDayByHour` views. None of these are needed for this
to work correctly today.

## Local dev

```sh
cd v2/apps/ted1k-derive
bun install
bun run dev
```

Needs two gitignored credential files at the workspace-root
`v2/infra/credentials/` (see [../../AGENTS.md](../../AGENTS.md)):

- `credentials.mysql.json` — `{ "host", "user", "password", "database" }`
- `credentials.nats.json` — `{ "servers": "<new NATS server address>" }` (e.g.
  `localhost:4222` when running `v2/infra/compose.yaml` locally)

## Verify

With `v2/infra/compose.yaml` up and both credential files in place:

```sh
bun run src/index.ts
```

Watch the published KV entry directly:

```sh
nats -s localhost:4222 kv get ted1k-derive tedcheck
```

Stop it — `SIGTERM`/`SIGINT` should produce a clean shutdown logged immediately,
not a hang or error.
