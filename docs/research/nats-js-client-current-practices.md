# NATS JavaScript/TypeScript Client — Current Practices (2026)

2026-08-03

**Erratum (2026-08-03, added after live verification against `im-qcic`'s actual production NATS server):** everything below was researched against official docs only, with no live server to check against — that gap turned out to be load-bearing. `im-qcic`'s production NATS server (`infra/gateway/docker-compose.yaml`, `synadia/nats-server:nightly-20220224`, reports itself as `2.7.3-beta.3`) was live-tested directly (read-only: `connect`, `jsm.streams.list/info`, and a bounded consumer fetch against the real `scrobblecastDigest` stream). **The modern Consumer API this doc recommends below (`js.consumers.get()` + `.fetch()`/`.consume()`) fails hard against this server**, throwing `consumers framework is only supported on servers 2.9.4 or better` — a version the client checks and refuses to work around, not a docs-guessable detail. The lower-level `jsm.consumers.add()` call (classic JetStream management) still works fine at this server version. Separately confirmed: the **legacy `nats` v2 package (`nats@2.29.3`, the same one `scrobblecast/js` already depends on) reads this stream correctly** via the old `consumerOpts()` + `js.subscribe()` pattern — real digest messages, matching shape, no errors.

**Practical consequence for this repo:** any service reading directly from the current production NATS server must use the legacy `nats` v2 client, not `@nats-io/jetstream`'s modern Consumer API, until/unless that server itself is upgraded (tracked as a separate, deliberately out-of-scope future effort — see `docs/agents` / issue #235 and its tickets for the current plan, which routes around this by having such a service bridge to a second, modern NATS server for its own publish side). The modern `@nats-io/*` packages remain the right choice for anything that only ever talks to a new/current-version server.

**Original summary (below), now understood to be true only for a current-version server (≥2.9.4), not the specific 2.7.3-beta.3 server this repo runs today.** The old monolithic `nats` npm package (v2.x) is deprecated as of v2.29.3, with the npm registry itself flagging it: "Package moved. Use @nats-io/transport-node from https://github.com/nats-io/nats.js" (registry.npmjs.org, accessed 2026-08-03). The `nats-io/nats.js` GitHub repo is now a monorepo of scoped `@nats-io/*` packages, currently on major version 3 (3.4.0 as of this check), superseding the separate `nats.deno`, `nats.node`, and `nats.ws` projects. The old `consumerOpts()` / `js.subscribe()` / `js.pullSubscribe()` pattern from the reference code is explicitly superseded by a new Consumer API (`jsm.consumers.add()` + `js.consumers.get()` + `consumer.fetch()`/`consumer.consume()`), per the migration guide. `nats.ws` is deprecated in favor of `@nats-io/nats-core`'s built-in `wsconnect()`. For the "publish latest + let late joiners read it" problem, both `@nats-io/kv` and plain JetStream streams configured with `max_msgs_per_subject` are documented, primary-source-confirmed mechanisms; KV is the more idiomatic, higher-level fit for this monorepo's browser-facing "derive" service.

## Q1: Server-side (Node/Bun) client packages in 2026

### Package split — confirmed

The single `nats` package has split into scoped `@nats-io` packages. The `nats.js` GitHub repo README states the project "reorganizes the NATS Base Client library (originally part of nats.deno), into multiple modules, and on-boards the supported transports," and that it supersedes the three legacy projects `nats.deno`, `nats.ws`, and the original `nats.node` (github.com/nats-io/nats.js, accessed 2026-08-03).

Current package set relevant to a Bun/TypeScript server process:

| Package                   | Purpose                                                                 | Version (npm, accessed 2026-08-03)               |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `@nats-io/transport-node` | TCP transport for Node.js **and Bun**                                   | 3.4.0                                            |
| `@nats-io/nats-core`      | Core pub/sub, request-reply, codec-free `json()`/`string()` msg helpers | 3.4.0                                            |
| `@nats-io/jetstream`      | JetStream stream/consumer management and messaging                      | 3.4.0                                            |
| `@nats-io/kv`             | Key-value store (built on JetStream)                                    | 3.4.0                                            |
| `@nats-io/obj`            | Object store (built on JetStream)                                       | not directly queried, same monorepo/version line |
| `@nats-io/services`       | Microservices framework                                                 | mentioned in README, not queried for version     |

Versions confirmed directly against the npm registry JSON API (`registry.npmjs.org/@nats-io/{transport-node,jetstream,kv,nats-core}/latest`, accessed 2026-08-03): all four core packages are at **3.4.0**, and `@nats-io/transport-node` depends on `@nats-io/nats-core@3.4.0`, `@nats-io/jetstream` depends on `@nats-io/nats-core@3.4.0`, `@nats-io/kv` depends on `@nats-io/jetstream@3.4.0` and `@nats-io/nats-core@3.4.0`. The old `nats` package is pinned at 2.29.3 and marked deprecated in npm metadata (registry.npmjs.org/nats/latest, accessed 2026-08-03).

For a Bun/TypeScript server talking JetStream, the recommended install is:

```bash
bun add @nats-io/transport-node @nats-io/jetstream @nats-io/kv
```

(`@nats-io/nats-core` comes in transitively via `transport-node`, but importing `connect` from `@nats-io/transport-node` is the documented entry point — see below.)

### Bun compatibility

The `transport-node` README explicitly states: "This library is compatible with [Bun](https://bun.sh/)" (github.com/nats-io/nats.js, `transport-node/README.md`, accessed 2026-08-03), and lists `bun install @nats-io/transport-node` as a supported install method. The top-level repo description itself reads "JavaScript client for Node.js, Bun, Deno and browser for NATS" (github.com/nats-io/nats.js, accessed 2026-08-03), i.e. Bun is a first-class, named target, not an unofficial/best-effort runtime. No specific Bun caveats or open compatibility issues were found in the README; a search for Bun-related nats.js GitHub issues surfaced only an old, unrelated `oven-sh/bun` issue (#3170) predating the current package split, not a currently-open nats.js compatibility problem. Treat this as "no known blocking issues found," not "exhaustively verified" — worth a quick issues-search pass again for `nats.js` specifically closer to implementation time.

### Idiomatic code (current Consumer API, not the old consumerOpts()/subscribe())

**(a) Publish a JSON message to a subject**

```ts
import { connect } from "@nats-io/transport-node";

const nc = await connect({ servers: "localhost:4222" });

const payload = { temperature: 72.5, timestamp: Date.now() };
nc.publish("sensors.temp", JSON.stringify(payload));

await nc.drain();
```

Note: the old `JSONCodec()`/`StringCodec()` encoder objects are gone. The current idiom publishes a `string`/`Uint8Array` directly (client converts internally), and on the receive side calls `m.json<T>()` or `m.string()` on the message object rather than decoding through a codec (github.com/nats-io/nats.js, `core/README.md`, accessed 2026-08-03; migration map at `migration.md` confirms `JSONCodec` → call `.json()` on the message, `StringCodec` → call `.string()` on the message).

**(b) Idempotent stream creation**

```ts
import { jetstreamManager } from "@nats-io/jetstream";

const jsm = await jetstreamManager(nc);

const name = "SENSORS";
try {
  await jsm.streams.add({ name, subjects: ["sensors.*"] });
} catch {
  // already exists — fetch and update if config needs to change
  const info = await jsm.streams.info(name);
  info.config.subjects = ["sensors.*"];
  await jsm.streams.update(info.config);
}
```

(Pattern derived from github.com/nats-io/nats.js, `jetstream/README.md`, accessed 2026-08-03, which shows `jsm.streams.add()` and `jsm.streams.update()` for stream lifecycle management; the try/catch idempotency wrapping is a standard extension of that same add/info/update pattern, not a literal doc quote.)

**(c) Replay the last N hours from a stream, then stop — modern Consumer API**

```ts
import {
  jetstream,
  jetstreamManager,
  AckPolicy,
  DeliverPolicy,
} from "@nats-io/jetstream";

const jsm = await jetstreamManager(nc);
const js = jetstream(nc);

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

await jsm.consumers.add("SENSORS", {
  durable_name: "replay-last-hour",
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.ByStartTime,
  opt_start_time: oneHourAgo.toISOString(),
});

const consumer = await js.consumers.get("SENSORS", "replay-last-hour");

// Pull a bounded batch and stop once exhausted:
const messages = await consumer.fetch({ max_messages: 1000, expires: 5_000 });
for await (const m of messages) {
  console.log(m.subject, m.string());
  m.ack();
}
```

This is the github.com/nats-io/nats.js `jetstream/README.md` (accessed 2026-08-03) example, using `DeliverPolicy.ByStartTime` + `opt_start_time` (the modern equivalent of the old `OptStartTime` field) and the `consumer.fetch()` bounded-batch call rather than `js.subscribe()`. For a continuous live-tail after the initial replay, the same README shows `consumer.consume()` returning an async-iterable stream instead. The migration doc (`migration.md`, same repo, accessed 2026-08-03) explicitly states the old `js.subscribe()` / `js.pullSubscribe()` calls and the `consumerOpts()` builder are replaced by this Consumers API (`consumer.get()` + plain config objects) — confirming the reference code's pattern is stale and should not be carried forward as-is.

## Q2: Browser websocket client (nats.ws) in 2026

`nats.ws` as a standalone package is **deprecated**. Its npm registry entry (currently at version 1.30.3) carries the deprecation notice: "Package deprecated. Use @nats-io/nats-core or nats.js instead" (registry.npmjs.org/nats.ws/latest, accessed 2026-08-03). Websocket support has moved into `@nats-io/nats-core` itself, which exports a `wsconnect()` function described in its README as "semantically equivalent to the traditional connect, but returns a NatsConnection backed by a W3C WebSocket" (github.com/nats-io/nats.js, `core/README.md`, accessed 2026-08-03). Note `wsconnect()` assumes `wss://` and defaults to port 443, not the plain-TCP 4222 default.

For a browser app, install `@nats-io/nats-core` directly (no transport package needed — the websocket transport ships in core for browser/W3C environments).

### Idiomatic React usage

```tsx
import { useEffect, useState } from "react";
import { wsconnect, type NatsConnection } from "@nats-io/nats-core";

interface DerivedState {
  value: number;
  updatedAt: string;
}

function useLiveDerivedState(subject: string) {
  const [state, setState] = useState<DerivedState | null>(null);

  useEffect(() => {
    let nc: NatsConnection | undefined;
    let cancelled = false;

    (async () => {
      nc = await wsconnect({ servers: "wss://nats.example.com:443" });
      if (cancelled) {
        await nc.close();
        return;
      }

      const sub = nc.subscribe(subject);
      for await (const m of sub) {
        setState(m.json<DerivedState>());
      }
    })();

    return () => {
      cancelled = true;
      nc?.close();
    };
  }, [subject]);

  return state;
}
```

`nc.close()` unsubscribes and tears down the connection; there's no separate explicit `sub.unsubscribe()` required if the connection itself is closed, but calling `sub.unsubscribe()` before `nc.close()` is also valid if the component only wants to drop the subscription while keeping a shared connection alive elsewhere. Message decoding uses the same `m.json<T>()` helper as the server-side core client — there's a single, consistent decode idiom across `@nats-io/nats-core` regardless of transport (github.com/nats-io/nats.js, `core/README.md`, accessed 2026-08-03).

## Q3: JetStream Consumer API / KV / Object Store fit for a "derive" service

### Does the Consumer API help for step (a) — startup replay of upstream history?

Yes, meaningfully, and this is the documented reason JetStream consumers exist at all rather than plain core subscriptions: core NATS pub/sub has no message retention or replay — a subscriber only sees messages published while it is connected. JetStream streams retain messages per their retention policy, and **consumers** are the addressable, position-tracking view into that retained history. The JetStream docs describe `DeliverPolicy` (including `ByStartTime`/`opt_start_time`, the "last N hours" case) and `AckPolicy` as consumer-level configuration for controlling exactly which historical slice of the stream a given consumer receives (docs.nats.io/nats-concepts/jetstream/consumers, and the pull-consumer operational guide at docs.nats.io/using-nats/developer/develop_jetstream/consumers, both accessed 2026-08-03). Plain core pub/sub cannot do "give me the last N hours, then stop" at all — there is no history to replay without a stream + consumer sitting underneath it. So for step (a), the Consumer API is the load-bearing feature — it is what makes "process recent history on startup" possible, not just convenient.

### Is there a documented pattern for late-joining subscribers on step (b)?

Two documented, primary-source mechanisms fit this need for the derived/aggregated-result-to-a-plain-subject side:

1. **`@nats-io/kv`.** KV is explicitly a thin, ergonomic layer over a JetStream stream: "a bucket is... a JetStream stream named `KV_<bucket>` whose subjects are `$KV.<bucket>.>`," and "a `get` of a value reads the last message for a subject" (docs.nats.io/nats-concepts/jetstream/key-value-store, accessed 2026-08-03). Its `watch()` API is documented to deliver "a snapshot of every key" (i.e. current state) followed by live updates — precisely "publish latest AND let a late joiner read it without waiting for the next publish" (same page; API usage confirmed against github.com/nats-io/nats.js `kv/README.md`, accessed 2026-08-03, which shows `kv.get()` returning the last value and `kv.watch()` delivering current-state-then-updates).

2. **Stream `max_msgs_per_subject` (Limits retention).** JetStream's `StreamConfig` supports `max_msgs_per_subject`, which "specifies the number of messages to retain in the store for this stream per unique subject" — i.e. configuring it to `1` keeps only the latest message per subject fetchable directly from the stream, without a KV bucket. This is a `StreamConfig` field documented in the NATS TypeScript interface reference (nats-io.github.io/nats.deno/interfaces/StreamConfig.html, surfaced via search, cross-checked against the general Limits-retention description on docs.nats.io/nats-concepts/jetstream/streams which confirms Limits retention as the default policy governed by count/age/size thresholds, both accessed 2026-08-03). I did not find `max_msgs_per_subject` called out on the docs.nats.io conceptual retention-policies page directly — it's documented at the `StreamConfig` API-reference level rather than the prose concepts page, so treat this citation as API-reference-level rather than tutorial-level confirmation.

### Recommendation

Use **`@nats-io/kv`** for the derived/aggregated state that the browser needs on connect, and keep the plain-subject `nc.publish()` for live push updates to already-connected browsers. Justification:

- KV gives an explicit, cheap `get()` for late joiners (e.g. an intermediary/API route the browser hits on page load, or the derive service's own health/status endpoint) — no need to also stand up a consumer or parse stream position semantics just to answer "what's the current value."
- `watch()` unifies "current snapshot + subsequent live updates" in one call, which maps directly onto the derive service's own consumer-side needs too (it could watch an upstream KV bucket instead of re-deriving from raw stream replay, if the upstream already publishes computed state into KV).
- It avoids overloading the plain pub/sub subject's semantics — the pub/sub subject stays a pure "fire and forget, no history" fan-out channel for connected clients, while KV is the durable, queryable, last-value store. Using `max_msgs_per_subject` on a raw stream is a viable lighter-weight alternative if a full KV bucket feels like too much ceremony for a single-key "latest state" value, but it requires the browser (or intermediary) to talk JetStream (fetch last message on the subject) rather than a single well-documented `kv.get()` call, and KV's API is the more idiomatic, purpose-built fit per the docs.

## Sources

- https://github.com/nats-io/nats.js (repo root README) — confirms monorepo reorg, package list, Node/Bun/Deno/browser support, supersedes nats.deno/nats.node/nats.ws. Accessed 2026-08-03.
- https://github.com/nats-io/nats.js/blob/main/core/README.md — core pub/sub, `connect()`, `json()`/`string()` message decoding, `wsconnect()`. Accessed 2026-08-03.
- https://github.com/nats-io/nats.js/blob/main/jetstream/README.md — stream add/update, JetStream publish, modern Consumer API (`jsm.consumers.add`, `js.consumers.get`, `consumer.fetch()`/`consumer.consume()`), `DeliverPolicy.ByStartTime`/`opt_start_time`. Accessed 2026-08-03.
- https://github.com/nats-io/nats.js/blob/main/kv/README.md — `Kvm`, `kv.create()`/`put()`/`get()`/`watch()`. Accessed 2026-08-03.
- https://github.com/nats-io/nats.js/blob/main/transport-node/README.md — explicit Bun compatibility statement, Node version support policy. Accessed 2026-08-03.
- https://github.com/nats-io/nats.js/blob/main/migration.md — v2→v3 API migration map (JSONCodec/StringCodec → message `.json()`/`.string()`; `consumerOpts()`/`js.subscribe()` → Consumers API). Accessed 2026-08-03.
- https://registry.npmjs.org/nats/latest — `nats` npm package version 2.29.3, marked deprecated, points to `@nats-io/transport-node`. Accessed 2026-08-03.
- https://registry.npmjs.org/@nats-io/transport-node/latest — version 3.4.0, deps on `@nats-io/nats-core@3.4.0`. Accessed 2026-08-03.
- https://registry.npmjs.org/@nats-io/jetstream/latest — version 3.4.0, deps on `@nats-io/nats-core@3.4.0`. Accessed 2026-08-03.
- https://registry.npmjs.org/@nats-io/kv/latest — version 3.4.0, deps on `@nats-io/jetstream@3.4.0` and `@nats-io/nats-core@3.4.0`. Accessed 2026-08-03.
- https://registry.npmjs.org/@nats-io/nats-core/latest — version 3.4.0. Accessed 2026-08-03.
- https://registry.npmjs.org/nats.ws/latest — version 1.30.3, marked deprecated, points to `@nats-io/nats-core`/nats.js. Accessed 2026-08-03.
- https://docs.nats.io/nats-concepts/jetstream/consumers — consumer concepts (pull consumers, DeliverPolicy/AckPolicy at a high level). Accessed 2026-08-03.
- https://docs.nats.io/using-nats/developer/develop_jetstream/consumers — operational guide to pull consumers, `fetch` vs `consume`, `batch`/`expires` bounding fields. Accessed 2026-08-03.
- https://docs.nats.io/nats-concepts/jetstream/key-value-store — KV as a JetStream stream layer, `get()` reads last message per subject, `watch()` snapshot-then-updates semantics. Accessed 2026-08-03.
- https://docs.nats.io/nats-concepts/jetstream/streams — retention policies overview (Limits default, Interest, WorkQueue) and discard policy (Old default vs New). Accessed 2026-08-03.
- https://nats-io.github.io/nats.deno/interfaces/StreamConfig.html — `StreamConfig.max_msgs_per_subject` field, surfaced via web search and treated as an API-reference-level source (not independently re-fetched in full; flagged in-text as such). Accessed 2026-08-03.
