# tedcheck

The live Tedcheck views (`/tedcheck` route). See
[issue #249](https://github.com/daneroo/im-qcic/issues/249).

Reads `ted1k-derive`'s three independently-cadenced KV entries (bucket
`ted1k-derive`, keys `missingLastDay`/`missingWeekByDay`/`missingDayByHour`)
directly from the browser (`@nats-io/nats-core`'s `wsconnect()` +
`@nats-io/kv`'s `watch()`), on the new NATS server only.

## Module shape

Mirrors `../scast/`'s split between pure transform, connection/retry, and the
React seam - though there's no transform module here, since KV values already
arrive as the exact `{meta,data}` shape to render (`watch()`'s `entry.json<T>()`
does the decoding):

- **`watch.ts`** — connection/retry/subscription orchestration for a single KV
  key. Knows nothing about NATS specifics or React:
  `watchKey(credentials, bucket, key, {onEntry, onStatus}, source)` takes an
  injectable `KvEntrySource`, runs a connect → watch → (on drop) wait →
  reconnect loop. Fully unit-tested against a fake `KvEntrySource`
  (`watch.test.ts`) — no real NATS server needed. Same shape as
  `../scast/feed.ts`'s retry loop (not shared with it — see this repo's
  established copy-over-share convention), generalized from "one stream" to "one
  KV key."
- **`kv-source.ts`** — the real `KvEntrySource`: `wsconnect()` +
  `kvm.open(bucket)` + `kv.watch({key})`. `open()`, not `create()` — this app
  only ever reads, the bucket is `ted1k-derive`'s to own. Thin and untested
  directly (verified live instead), mirroring `../scast/nats-source.ts`.
- **`useDerivedState.ts`** — the seam into React:
  `useDerivedState<T>(servers, bucket, key)`, called once per view. Decodes each
  KV entry via `entry.json<T>()` and exposes `{status, value}`.
  `src/routes/tedcheck.tsx` calls this three times (once per key) and never
  reaches into `watch.ts`'s or `kv-source.ts`'s internals.
- **`config.ts`** / **`types.ts`** — the bucket/key names and wire shape
  `ted1k-derive` publishes, copied (not imported) from its own
  `src/config.ts`/`src/poll.ts` — separate deployables agreeing on a contract,
  not sharing TypeScript across a package boundary.

## Local dev

Needs `v2/infra/compose.yaml` up (`nats` + `ted1k-derive`) and
`VITE_NATS_WS_URL` set if not using the local default (see `../config.ts`).

```sh
cd v2/apps/web
bun run dev
```

Open `/tedcheck` — each of the three views should show live data within a few
seconds, and update independently on its own cadence (60s / 5min / 10min).
