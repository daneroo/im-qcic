// Reads Scrobblecast's real scrobblecastDigest JetStream stream from the
// PRODUCTION NATS server - deliberately using the legacy `nats` v2 package
// (consumerOpts()/js.subscribe()), not the modern @nats-io/* Consumer API.
// This is required, not a style choice: live-verified (see
// docs/research/nats-js-client-current-practices.md's erratum) that the
// modern Consumer API hard-fails against this server's actual version
// (2.7.3-beta.3, needs >=2.9.4) - the legacy client is the only one that
// works here. See README.md for the full two-client architecture this
// service is built around.

import { connect, consumerOpts, JSONCodec, type NatsConnection } from "nats";
import type { CheckpointRecord } from "./logcheck";

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
  // Replays the last `windowMs` of the digest stream and returns the
  // scope==='item' records as CheckpointRecords.
  fetchRecent(windowMs: number): Promise<CheckpointRecord[]>;
  close(): Promise<void>;
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
    async fetchRecent(windowMs: number): Promise<CheckpointRecord[]> {
      const nc = await getConnection();
      const js = nc.jetstream();

      const opts = consumerOpts();
      opts.orderedConsumer();
      opts.ackNone();
      opts.startAtTimeDelta(windowMs);

      const sub = await js.subscribe(SUBJECT, opts);
      const jc = JSONCodec<RawDigestMessage>();

      const records: CheckpointRecord[] = [];
      const emptyTimeoutMs = 2_000;
      let to = setTimeout(() => sub.unsubscribe(), emptyTimeoutMs);

      for await (const m of sub) {
        clearTimeout(to);
        const { stamp, host, digest, scope } = jc.decode(m.data);
        if (scope === "item") {
          records.push({ stamp, host, digest });
        }
        if (m.info.pending === 0) {
          sub.unsubscribe();
          break;
        }
        to = setTimeout(() => sub.unsubscribe(), emptyTimeoutMs);
      }
      clearTimeout(to);
      return records;
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
