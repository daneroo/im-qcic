// The real MessageSource (see feed.ts) - thin wiring over wsconnect() +
// an ordered JetStream consumer. Kept separate from feed.ts's retry
// orchestration and untested directly here (verified live instead, see
// README) - same split scast-bridge uses between its pure bridge.ts and
// its real scrobblecast-source.ts/scast-sink.ts.

import { wsconnect } from "@nats-io/nats-core";
import { jetstream, DeliverPolicy } from "@nats-io/jetstream";
import {
  SCAST_STREAM_NAME,
  SCAST_SUBJECT,
  type MessageSource,
  type OpenedSource,
  type ScastCredentials,
} from "./feed";

// How far back an ordered consumer replays on open - every browser tab is
// a fresh client (no durable position to resume from), so this window
// bounds how much backlog a first paint has to wait through. Matches
// scast-bridge's own default.
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const natsMessageSource: MessageSource = {
  async open(credentials: ScastCredentials): Promise<OpenedSource> {
    const nc = await wsconnect({ servers: credentials.servers });
    const js = jetstream(nc);

    // An ordered consumer: ephemeral, no server-side durable state (there's
    // nothing sensible to resume from a browser tab that may never come
    // back), and the client library transparently recreates it across
    // reconnects - ack_policy is forced to "none" internally, so messages
    // are never ack()'d below.
    const consumer = await js.consumers.get(SCAST_STREAM_NAME, {
      filter_subjects: [SCAST_SUBJECT],
      deliver_policy: DeliverPolicy.StartTime,
      opt_start_time: new Date(Date.now() - DEFAULT_WINDOW_MS).toISOString(),
    });
    const consumerMessages = await consumer.consume();

    async function* messages(): AsyncGenerator<Uint8Array> {
      for await (const m of consumerMessages) {
        yield m.data;
      }
    }

    return {
      messages: messages(),
      async close(): Promise<void> {
        await consumerMessages.close();
        await nc.close();
      },
    };
  },
};
