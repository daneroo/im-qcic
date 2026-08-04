# @daneroo/qcic-scast-bridge

Copies Scrobblecast's real `scrobblecastDigest` JetStream stream,
message-for-message unchanged, from the production NATS server onto the new
`v2/infra` NATS server under a renamed subject/stream — nothing more. See
[../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions.

## Why "bridge," not "derive"

This service was originally built (and named `scast-derive`) to also cross-tab
the raw digest messages into a per-generation, per-host table. That turned out
to be a design mistake: the cross-tab adds no information — every fact in the
output was already present in the input messages, it's pure rearrangement.
That's not derivation, and it's fully portable: the same transform run
client-side (in `web`) or server-side produces identical output. A genuine
derived fact would be a **synchronization verdict** (do all hosts agree for a
given generation) — a real judgment computed by comparing across messages — but
there's no server-side home for that yet, so it's deliberately deferred.

So this service's only job is the copy-through. The cross-tab transform (and
eventually the synchronization judgment) belongs in `web`, built as an isolated,
portable module from the start since it's meant to work in more than one place
eventually.

## Architecture: two NATS servers, two client packages

- **Read side → production** (`infra/gateway`'s real NATS server — there's no
  alternative source for `scrobblecastDigest`). Uses the **legacy `nats` v2
  package** (`consumerOpts()` + `js.subscribe()`, the same client
  `scrobblecast/js` itself depends on) — required, not a style choice: the
  modern `@nats-io/*` Consumer API hard-fails against this server's actual
  version (`2.7.3-beta.3`, needs ≥2.9.4; see
  `docs/research/nats-js-client-current-practices.md`'s erratum). A **durable
  named consumer** (`scast-bridge`) means a restart resumes from its last
  acknowledged position rather than re-replaying — and re-publishing — the whole
  backlog every time. See `scrobblecast-source.ts`.
- **Write side → the new NATS server** (`v2/infra/compose.yaml`, from #236 —
  genuinely separate infrastructure, never the production server). Uses the
  **modern `@nats-io/*` packages**. The destination stream (`scastDigest`)
  mirrors the source stream's own retention config (`retention`, `max_age`,
  `discard`) — fetched live from the real source stream on startup, not
  duplicated as a guessed/hardcoded value that could drift out of sync. Each
  publish carries a `Nats-Msg-Id` derived from the source message's own stream
  sequence number, for defense-in-depth dedup — though the durable consumer's
  resumability is the real correctness guarantee day to day, since NATS's dedup
  window (2 minutes) is too short to matter across real restarts. See
  `scast-sink.ts`.

Subject/stream naming: `im.scrobblecast.scrape.digest` (production, fixed — not
ours to rename) becomes `im.scast.scrape.digest` (ours — "we're in a new
namespace"). The destination stream is named `scastDigest`, matching the
source's own `<service>Digest` naming precedent (not `KV_...` — this is a plain
stream, not a KV bucket; the earlier `scast-derive` design published into a KV
bucket, since retired along with the aggregation it existed to serve).

**Known gap, verified not to matter today**: the source stream's own config
lists two subjects, `im.scrobblecast.scrape.digest` and
`im.scrobblecast.scrape.digest.>` — the destination stream mirrors both, but
this bridge's _read side_ only subscribes to the bare subject. Live-verified (a
targeted subscription to the wildcard-only pattern, replayed against the full
stream) that the wildcard has never actually carried a message — it's dead
configuration in the source itself. If that ever changes, this bridge would need
a second consumer for the wildcard pattern, since NATS can't match both forms in
one subject filter.

## Local dev

```sh
cd v2/apps/scast-bridge
bun install
bun run dev
```

Needs two gitignored credential files at the workspace-root
`v2/infra/credentials/` (see [../../AGENTS.md](../../AGENTS.md)):

- `credentials.nats-prod.json` — `{ "servers": "<production NATS address>" }`
- `credentials.nats.json` — `{ "servers": "<new NATS server address>" }` (e.g.
  `localhost:4222` when running `v2/infra/compose.yaml` locally)

To observe the real production traffic directly:

```sh
nats -s nats.ts.imetrical.com sub -r "im.scrobblecast.>" | pino-pretty -a stamp -m title -S
```

## Verify

With `v2/infra/compose.yaml` up and both credential files in place:

```sh
bun run src/index.ts
```

Watch the copied stream directly:

```sh
nats -s localhost:4222 sub "im.scast.scrape.digest"
```

Stop it — `SIGTERM`/`SIGINT` should produce a clean shutdown logged immediately,
not a hang or error. Restarting should copy nothing new unless new messages
actually arrived upstream in the meantime (the durable consumer resumes from its
saved position, not the start of the window).
