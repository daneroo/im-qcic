// Reads Scrobblecast's real scrobblecastDigest JetStream stream from the
// PRODUCTION NATS server - deliberately using the legacy `nats` v2 package
// (consumerOpts()/js.subscribe()), not the modern @nats-io/* Consumer API.
// This is required, not a style choice: live-verified (see
// docs/research/nats-js-client-current-practices.md's erratum) that the
// modern Consumer API hard-fails against this server's actual version
// (2.7.3-beta.3, needs >=2.9.4) - the legacy client is the only one that
// works here. See README.md for the full two-server bridge architecture.
//
// Copy-through, not transformation: this module never decodes message
// payloads - it yields raw JsMsg (subject + opaque bytes) exactly as
// received. A durable named consumer means a restart resumes from its last
// acked position rather than re-replaying (and re-copying) the whole
// window every time.

import {
  connect,
  consumerOpts,
  createInbox,
  type JsMsg,
  type NatsConnection,
} from "nats";
import {
  DURABLE_NAME,
  SOURCE_STREAM_NAME,
  SOURCE_SUBJECT,
  type ScrobblecastCredentials,
} from "./config";

export interface SourceStreamConfig {
  retention: unknown;
  max_age: number;
  discard: unknown;
}

export interface ScrobblecastSource {
  // The real upstream stream's own retention config - fetched once, so the
  // destination stream (see scast-sink.ts) can mirror it exactly rather
  // than duplicating a guessed/hardcoded value that could drift out of
  // sync with the source.
  fetchSourceStreamConfig(): Promise<SourceStreamConfig>;
  // Yields raw messages as they arrive - historical backlog first (on the
  // durable consumer's first-ever creation only), then live, indefinitely.
  // Caller acks each message after it's been safely copied.
  subscribe(initialWindowMs: number): AsyncIterable<JsMsg>;
  close(): Promise<void>;
}

export function createScrobblecastSource(
  credentials: ScrobblecastCredentials | null,
): ScrobblecastSource {
  let ncPromise: Promise<NatsConnection> | null = null;

  async function getConnection(): Promise<NatsConnection> {
    if (!credentials) {
      throw new Error(
        "scast-bridge: production NATS credentials not configured",
      );
    }
    if (!ncPromise) {
      ncPromise = connect({
        servers: credentials.servers,
        name: "scast-bridge",
        maxReconnectAttempts: -1,
      });
    }
    return ncPromise;
  }

  return {
    async fetchSourceStreamConfig(): Promise<SourceStreamConfig> {
      const nc = await getConnection();
      const jsm = await nc.jetstreamManager();
      const info = await jsm.streams.info(SOURCE_STREAM_NAME);
      const { retention, max_age, discard } = info.config;
      return { retention, max_age, discard };
    },

    async *subscribe(initialWindowMs: number): AsyncIterable<JsMsg> {
      const nc = await getConnection();
      const js = nc.jetstream();

      const opts = consumerOpts();
      opts.durable(DURABLE_NAME);
      opts.manualAck();
      opts.ackExplicit();
      opts.deliverTo(createInbox());
      // Only takes effect the first time this durable consumer is ever
      // created - a restart resumes from its saved position regardless.
      opts.startAtTimeDelta(initialWindowMs);

      // Subscribes to the bare subject only, not the wildcard
      // im.scrobblecast.scrape.digest.> the source stream's own config
      // also lists - live-verified (a targeted subscription to the
      // wildcard-only pattern against a full replay of the real stream
      // returned zero messages, ever) that no sub-subject has actually
      // been published there. That wildcard entry is dead configuration
      // in the source itself, not something this bridge is choosing to
      // ignore. If that ever changes, this bridge would need a second
      // consumer for the wildcard pattern - NATS can't match both a bare
      // subject and its wildcard children in one filter.
      const sub = await js.subscribe(SOURCE_SUBJECT, opts);
      yield* sub;
    },

    async close(): Promise<void> {
      if (ncPromise) {
        const nc = await ncPromise;
        await nc.drain();
      }
    },
  };
}
