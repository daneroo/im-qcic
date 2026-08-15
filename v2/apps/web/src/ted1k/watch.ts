// Connects to a single NATS KV key on the new server and yields entries
// indefinitely, reconnecting on drop. Deliberately kept separate from any
// React/component code, and from kv-source.ts's real wsconnect+kv wiring -
// this module only knows "connect, hand me entries, retry if it stops."
// The source remains KV-specific; followSource owns the shared retry lifecycle.

import type { KvWatchEntry } from "@nats-io/kv";
import { followSource } from "../followSource";

export interface KvCredentials {
  servers: string;
}

export type WatchStatus =
  "connecting" | "connected" | "reconnecting" | "closed";

export interface WatchOptions {
  onEntry(entry: KvWatchEntry): void;
  onStatus?(status: WatchStatus): void;
  // How long to wait before reconnecting after the watch ends unexpectedly
  // (dropped connection, server restart) - not consulted on the happy
  // path, since a healthy watch() iterator never ends on its own.
  retryDelayMs?: number;
}

export interface Watch {
  close(): Promise<void>;
}

// The seam a real NATS/KV client sits behind - narrow enough to fake in
// tests (see watch.test.ts), wide enough that the real implementation
// (natsKvSource, in kv-source.ts) is a thin pass-through, not a
// reimplementation of connection handling.
export interface KvEntrySource {
  open(
    credentials: KvCredentials,
    bucket: string,
    key: string,
  ): Promise<OpenedKvEntries>;
}

export interface OpenedKvEntries {
  // Ends when the connection drops - that's the retry loop's signal to
  // reconnect, not a "watch complete" signal. A healthy source's iterable
  // only ends when close() is called.
  entries: AsyncIterable<KvWatchEntry>;
  close(): Promise<void>;
}

// Adapts ted1k's KV source to the shared reconnecting lifecycle.
export function watchKey(
  credentials: KvCredentials,
  bucket: string,
  key: string,
  opts: WatchOptions,
  source: KvEntrySource,
): Watch {
  return followSource({
    async open() {
      const opened = await source.open(credentials, bucket, key);
      return {
        values: opened.entries,
        close: () => opened.close(),
      };
    },
    onValue: opts.onEntry,
    onStatus: opts.onStatus,
    consumerName: "ted1k watch",
    retryDelayMs: opts.retryDelayMs,
  });
}
