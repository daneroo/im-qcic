# @daneroo/qcic-ted1k-derive

Polls Ted1k's MySQL `watt` table for Tedcheck's three missing-sample views —
`missingLastDay`, `missingWeekByDay`, `missingDayByHour` — and publishes each
one to its own key in a NATS KV bucket on the new `v2/infra` NATS server,
replacing the HTTP request/response cycle `site` used to poll `/api/tedcheck`
with a push. See [../../AGENTS.md](../../AGENTS.md) for workspace-wide
conventions.

Reuses `v2/apps/status/src/tedcheck.ts` (queries, `asTable`, `iso8601ify`) and
`tedcheck-datasource.ts` (`createMysqlDataSource`, including the
`decodeDecimalBuffers` Bun.SQL DECIMAL fix) unchanged — this service never talks
to the production NATS server, only MySQL as input and the new NATS server as
output.

## Independent views, independent cadences

Each view is queried and published on its own timer, not one shared poll loop —
see [issue #237](https://github.com/daneroo/im-qcic/issues/237)'s discussion for
why. `missingLastDay` recomputes a rolling 24h window on every call and is the
most volatile (default `60s`); `missingDayByHour` (24h grouped by hour) changes
moderately (default `5min`); `missingWeekByDay` (32-day window grouped by day)
is mostly stable, since only today's row is still growing (default `10min`).
Each is overridable independently via `POLL_INTERVAL_MISSING_LAST_DAY_MS`,
`POLL_INTERVAL_MISSING_DAY_BY_HOUR_MS`, `POLL_INTERVAL_MISSING_WEEK_BY_DAY_MS`.

Each KV entry is a self-contained `{meta, data}` payload — `data` is that view's
table, `meta` carries its own `stamp` (since views now refresh independently)
plus `hostname`/`version`/`type`/`view`. Bucket `ted1k-derive`, keys
`missingLastDay` / `missingWeekByDay` / `missingDayByHour` — matching the query
names in `tedcheck.ts`'s `queries` map 1:1.

**Future refinements, deliberately deferred** (see issue #237's discussion):
fetch-on-demand instead of/alongside periodic push, and making
`missingWeekByDay`/`missingDayByHour` incremental (diff-only) rather than
republishing the full table each cycle. Splitting the payload into per-query
keys — the third item originally listed there — is now built, and each view's
independent poll cadence went further than that original idea called for.

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

Watch a published KV entry directly:

```sh
nats -s localhost:4222 kv get ted1k-derive missingLastDay
```

Stop it — `SIGTERM`/`SIGINT` should produce a clean shutdown logged immediately,
not a hang or error.
