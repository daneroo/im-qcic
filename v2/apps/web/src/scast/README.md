# scast

The live cross-tab view (`/scast` route) — replaces `site`'s old
"Logcheck"/"ScrobbleCheck" view, built directly over NATS instead of the
Natsql/GraphQL bridge `site` used. See
[issue #250](https://github.com/daneroo/im-qcic/issues/250).

Reads `scast-bridge`'s raw copied JetStream stream (`scastDigest`) on the new
NATS server directly from the browser (`@nats-io/nats-core`'s `wsconnect()`),
never the production server and never through `scast-bridge` itself — `web` is a
normal consumer of its output, like any other.

## Module shape

Three independent pieces, deliberately not entangled with each other:

- **`generation.ts`** — the cross-tab transform. Pure, framework-free,
  NATS-free: reshapes `{generation, host, digest}` records into a table. Uses
  the message's own `generation` field directly (Scrobblecast's own "checkpoint"
  → "generation" terminology shift) rather than reconstructing a time bucket,
  the way the old Loggly-sourced path had to. Reuses `aggregate` unchanged from
  `v2/apps/status/src/logcheck.ts`'s logic; `parseDigestMessage` is new
  (validates + filters `scope:"item"` from the raw message shape). Strong
  candidate for future extraction into its own package if a second consumer ever
  needs it.
- **`feed.ts`** — connection/retry/subscription orchestration. Knows nothing
  about NATS or React: `subscribe(credentials, {onMessage, onStatus}, source)`
  takes an injectable `MessageSource`, runs a connect → consume → (on drop) wait
  → reconnect loop, and exposes `close()`. Fully unit-tested against a fake
  `MessageSource` (`feed.test.ts`) — no real NATS server needed.
- **`nats-source.ts`** — the real `MessageSource`: `wsconnect()` + an
  **ordered** JetStream consumer (`deliver_policy: StartTime`, 24h window).
  Ephemeral by design — no durable server-side state, since a browser tab is a
  new client every load, not a long-lived process like `scast-bridge`.
  `ack_policy` is forced to `"none"` for ordered consumers, so messages are
  never acked. Thin and untested directly (verified live instead); mirrors the
  split `scast-bridge` uses between its pure `bridge.ts` and its real
  `scrobblecast-source.ts`/`scast-sink.ts`.
- **`useScastFeed.ts`** — the seam into React: wires `feed.ts` + `generation.ts`
  together, decodes/accumulates records (bounded to a rolling 48h window so a
  tab left open for days doesn't grow unbounded), and re-derives the table on
  each message. `src/routes/scast.tsx` only calls this hook — it never reaches
  into `feed.ts`'s or `nats-source.ts`'s internals directly.

## Local dev

Needs `v2/infra/compose.yaml` up (`nats` + `scast-bridge`) and
`VITE_NATS_WS_URL` set if not using the local default (`ws://localhost:9222`,
matching `v2/infra/config/nats/nats-server.conf`'s websocket port).

```sh
cd v2/apps/web
bun run dev
```

Open `/scast` — should show live data within a few seconds once `scast-bridge`
has copied some backlog.
