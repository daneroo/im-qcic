// Connects to the new NATS server's scastDigest stream and yields raw
// message bytes indefinitely, reconnecting on drop. Deliberately kept
// separate from generation.ts (the pure transform) and from any
// React/component code - this module only knows "connect, hand me bytes,
// retry if it stops."

import { followSource } from "../followSource";

export const SCAST_STREAM_NAME = "scastDigest";
export const SCAST_SUBJECT = "im.scast.scrape.digest";

export interface ScastCredentials {
  servers: string;
}

export type FeedStatus = "connecting" | "connected" | "reconnecting" | "closed";

export interface SubscribeOptions {
  onMessage(data: Uint8Array): void;
  onStatus?(status: FeedStatus): void;
  // How long to wait before reconnecting after the message stream ends
  // unexpectedly (dropped connection, server restart) - not consulted on
  // the happy path, since a healthy consume() iterator never ends on its
  // own.
  retryDelayMs?: number;
}

export interface Feed {
  close(): Promise<void>;
}

// The seam a real NATS/JetStream client sits behind - narrow enough to
// fake in tests (see feed.test.ts), wide enough that the real
// implementation (createNatsMessageSource, below) is a thin pass-through,
// not a reimplementation of connection handling.
export interface MessageSource {
  open(credentials: ScastCredentials): Promise<OpenedSource>;
}

export interface OpenedSource {
  // Ends when the connection drops - that's the retry loop's signal to
  // reconnect, not a "query complete" signal. A healthy source's iterable
  // only ends when close() is called.
  messages: AsyncIterable<Uint8Array>;
  close(): Promise<void>;
}

// Adapts scast's message source to the shared reconnecting lifecycle.
export function subscribe(
  credentials: ScastCredentials,
  opts: SubscribeOptions,
  source: MessageSource,
): Feed {
  return followSource({
    async open() {
      const opened = await source.open(credentials);
      return {
        values: opened.messages,
        close: () => opened.close(),
      };
    },
    onValue: opts.onMessage,
    onStatus: opts.onStatus,
    consumerName: "scast feed",
    retryDelayMs: opts.retryDelayMs,
  });
}
