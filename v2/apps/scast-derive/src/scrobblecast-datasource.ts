// Reads Scrobblecast's real scrobblecastDigest JetStream stream from the
// PRODUCTION NATS server - deliberately using the legacy `nats` v2 package
// (consumerOpts()/js.subscribe()), not the modern @nats-io/* Consumer API.
// This is required, not a style choice: live-verified (see
// docs/research/nats-js-client-current-practices.md's erratum) that the
// modern Consumer API hard-fails against this server's actual version
// (2.7.3-beta.3, needs >=2.9.4) - the legacy client is the only one that
// works here. See README.md for the full two-client architecture this
// service is built around.
//
// Reactive, not polling: subscribe() live-tails the stream indefinitely
// (an ordered consumer naturally keeps waiting for new messages once its
// historical backlog is exhausted) - there's no fixed-interval re-fetch of
// the same window over and over.

import { connect, consumerOpts, JSONCodec, type NatsConnection } from "nats";
import type { CheckpointRecord } from "./digest";

// Stream is scrobblecastDigest, subjects im.scrobblecast.scrape.digest[.>] -
// this service only reads the base subject (both "item" and "history"
// scopes publish there; "history" is filtered out below).
const SUBJECT = "im.scrobblecast.scrape.digest";

export interface ScrobblecastCredentials {
  servers: string;
}

interface RawDigestMessage {
  stamp: string;
  host: string;
  digest: string;
  scope: string;
  // generation, elapsed are also present on the wire but unused here
}

export interface ScrobblecastDataSource {
  // Yields each scope==='item' record as it arrives, starting `windowMs`
  // in the past (historical backlog first, then live) and continuing
  // indefinitely - the seam this service is reactive through.
  subscribe(windowMs: number): AsyncIterable<CheckpointRecord>;
  close(): Promise<void>;
}

// The message-handling seam this service is tested through (#239's
// acceptance criteria): given a fake async iterable shaped like a real
// JetStream subscription (JSON-encoded .data), decode and filter to
// scope==='item' CheckpointRecords. No timers, no connection - pure
// message handling.
export async function* toItemRecords(
  messages: AsyncIterable<{ data: Uint8Array }>,
): AsyncGenerator<CheckpointRecord> {
  const jc = JSONCodec<RawDigestMessage>();
  for await (const m of messages) {
    const { stamp, host, digest, scope } = jc.decode(m.data);
    if (scope === "item") {
      yield { stamp, host, digest };
    }
  }
}

export function createNatsDataSource(
  credentials: ScrobblecastCredentials | null,
): ScrobblecastDataSource {
  let ncPromise: Promise<NatsConnection> | null = null;

  async function getConnection(): Promise<NatsConnection> {
    if (!credentials) {
      throw new Error(
        "scast-derive: production NATS credentials not configured",
      );
    }
    if (!ncPromise) {
      ncPromise = connect({
        servers: credentials.servers,
        name: "scast-derive",
        maxReconnectAttempts: -1,
      });
    }
    return ncPromise;
  }

  return {
    async *subscribe(windowMs: number): AsyncIterable<CheckpointRecord> {
      const nc = await getConnection();
      const js = nc.jetstream();

      const opts = consumerOpts();
      opts.orderedConsumer();
      opts.ackNone();
      opts.startAtTimeDelta(windowMs);

      const sub = await js.subscribe(SUBJECT, opts);
      yield* toItemRecords(sub);
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
