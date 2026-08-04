// Publishes to the NEW NATS server (from #236), not production - the
// modern @nats-io/* client, kept deliberately separate from
// scrobblecast-source.ts's legacy client. See README.md.

import { connect, type NatsConnection } from "@nats-io/transport-node";
import {
  jetstream,
  jetstreamManager,
  type JetStreamClient,
  type RetentionPolicy,
  type DiscardPolicy,
} from "@nats-io/jetstream";
import { DEST_STREAM_NAME, DEST_SUBJECT_PREFIX } from "./config";
import type { NatsCredentials } from "./config";
import type { SourceStreamConfig } from "./scrobblecast-source";

export interface ScastSink {
  publish(subject: string, data: Uint8Array, msgId: string): Promise<void>;
  close(): Promise<void>;
}

export function createScastSink(
  credentials: NatsCredentials | null,
  sourceStreamConfig: SourceStreamConfig,
): ScastSink {
  let ncPromise: Promise<NatsConnection> | null = null;
  let jsPromise: Promise<JetStreamClient> | null = null;

  async function getJetstream(): Promise<JetStreamClient> {
    if (!credentials) {
      throw new Error(
        "scast-bridge: new-server NATS credentials not configured",
      );
    }
    if (!ncPromise) {
      ncPromise = connect({ servers: credentials.servers });
    }
    if (!jsPromise) {
      jsPromise = (async () => {
        const nc = await ncPromise!;
        const jsm = await jetstreamManager(nc);
        // Mirrors the source stream's own retention config (fetched live,
        // not duplicated as a hardcoded guess) - same depth of history,
        // same discard behavior, just under our own name/subjects.
        try {
          await jsm.streams.add({
            name: DEST_STREAM_NAME,
            subjects: [DEST_SUBJECT_PREFIX, `${DEST_SUBJECT_PREFIX}.>`],
            retention: sourceStreamConfig.retention as RetentionPolicy,
            max_age: sourceStreamConfig.max_age,
            discard: sourceStreamConfig.discard as DiscardPolicy,
          });
        } catch {
          // already exists - fine, idempotent (mirrors
          // scrobblecast/js/lib/nats.js's own findOrCreateStream pattern)
        }
        return jetstream(nc);
      })();
    }
    return jsPromise;
  }

  return {
    async publish(
      subject: string,
      data: Uint8Array,
      msgId: string,
    ): Promise<void> {
      const js = await getJetstream();
      await js.publish(subject, data, { msgID: msgId });
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
