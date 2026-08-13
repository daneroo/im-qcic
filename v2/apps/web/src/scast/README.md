# scast

The `/scast` reading shows whether Scrobblecast's independently maintained
copies converge, and how many generations a divergence lasts. Convergence is
nominal: there is no majority, consensus value, or per-copy score.

The browser reads `scast-bridge`'s copied `scastDigest` JetStream stream from
the local NATS WebSocket endpoint. It retains a bounded 48-hour client window;
the ordered consumer requests the stream's 24-hour replay.

## Module shape

- **`generation.ts`** validates item-scope wire messages and keeps their
  generation, publish stamp, digest, host, and scrape duration.
- **`derive.ts`** is the framework-free convergence model. It distinguishes
  pending from settled generations, convergence from divergence, identifies
  runs, and marks only an overlong run that is still open as critical.
- **`feed.ts`** owns connection, retry, and subscription orchestration behind an
  injectable message-source interface.
- **`nats-source.ts`** implements that interface with an ephemeral ordered
  JetStream consumer.
- **`useScastFeed.ts`** decodes and accumulates records, then derives one
  `ScastReading` for React.
- **`ScastPage.tsx`** and **`marks.tsx`** render the selected Strata design. The
  table and convergence strip both read newest-first, with now on the left.

## Local development

Start `v2/infra/compose.yaml`; its `nats` and `scast-bridge` services provide
the local stream. The default browser endpoint is `ws://localhost:9222`; set
`VITE_NATS_WS_URL` only when testing another compose environment.

```sh
cd v2/apps/web
bun run dev
```
