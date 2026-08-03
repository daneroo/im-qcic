# @daneroo/qcic-scast-derive

Derives Scrobblecast's checkpoint-digest table (the "Logcheck" view — gaps
across its 3 peer scraper instances) from NATS, publishing the result to a NATS
KV bucket for `web` to consume live. Replaces `v2/apps/status`'s `/api/logcheck`
endpoint (Loggly-backed) with a NATS-native equivalent. See
[../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions.

## Two NATS servers, two client packages — deliberately

This service is a bridge, not just a derive service, and it depends on **two
separate NATS servers with two separate client packages**. This is architecture,
not an accident — don't "simplify" it to one client without re-reading why:

- **Read side → production** (`infra/gateway`'s real NATS server, where
  Scrobblecast's actual `scrobblecastDigest` JetStream stream lives — there is
  no alternative source for this data). Uses the **legacy `nats` v2 package**
  (`consumerOpts()` + `js.subscribe()`, the same client `scrobblecast/js` itself
  depends on), because the modern `@nats-io/*` Consumer API **hard-fails**
  against this server's actual version (`2.7.3-beta.3` — the modern client
  requires ≥2.9.4, confirmed live, not assumed; see
  `docs/research/nats-js-client-current-practices.md`'s erratum). See
  `scrobblecast-datasource.ts`.
- **Write side → the new NATS server** (`v2/infra/compose.yaml`, provisioned in
  #236 — genuinely separate infrastructure, not a config change to prod). Uses
  the **modern `@nats-io/*` packages** (`@nats-io/transport-node` +
  `@nats-io/kv`), publishing the derived digest table into a KV bucket. See
  `kv-publish.ts`.

No publishing ever happens against the production server — that's a hard
constraint, not a preference (introducing new, unproven publishers against the
only real source of Scrobblecast's data was judged an unacceptable risk during
planning).

## Local dev

```sh
cd v2/apps/scast-derive
bun install
bun run dev
```

Needs two gitignored credential files at the workspace-root
`v2/infra/credentials/` (see [../../AGENTS.md](../../AGENTS.md)):

- `credentials.nats-prod.json` — `{ "servers": "<production NATS address>" }`
- `credentials.nats.json` — `{ "servers": "<new NATS server address>" }` (e.g.
  `localhost:4222` when running `v2/infra/compose.yaml` locally)

Without them, the poll cycle logs an error and does nothing that cycle —
expected, not broken.

To observe the real production traffic directly while working on the read side:

```sh
nats -s nats.ts.imetrical.com sub -r "im.scrobblecast.>" | pino-pretty -a stamp -m title -S
```

## Verify

With `v2/infra/compose.yaml` up and both credential files in place:

```sh
bun run src/index.ts
```

Then, from another shell, read what got published:

```ts
import { connect } from "@nats-io/transport-node";
import { Kvm } from "@nats-io/kv";
const nc = await connect({ servers: "localhost:4222" });
const kv = await new Kvm(nc).open("scast-derive");
console.log((await kv.get("logcheck"))?.string());
```

Stop it — `SIGTERM`/`SIGINT` should produce a clean shutdown logged immediately,
not a hang or error.
