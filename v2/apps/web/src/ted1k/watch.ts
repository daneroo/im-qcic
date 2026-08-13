// Connects to a single NATS KV key on the new server and yields entries
// indefinitely, reconnecting on drop. Deliberately kept separate from any
// React/component code, and from kv-source.ts's real wsconnect+kv wiring -
// this module only knows "connect, hand me entries, retry if it stops."
// Same shape as v2/apps/web/src/scast/feed.ts's retry loop - not shared
// with it (see this repo's established copy-over-share convention), but
// worth reading side by side if touching either.

import type { KvWatchEntry } from "@nats-io/kv";

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

// Owns the connect -> watch -> (on drop) wait -> reconnect loop. Runs
// until close() is called; every other exit path (a dropped connection, a
// thrown error) is treated as transient and retried, never surfaced as a
// terminal failure - onStatus is the only way a caller observes trouble.
export function watchKey(
  credentials: KvCredentials,
  bucket: string,
  key: string,
  opts: WatchOptions,
  source: KvEntrySource,
): Watch {
  const retryDelayMs = opts.retryDelayMs ?? 3000;
  let closed = false;
  let activeClose: (() => Promise<void>) | null = null;

  async function run(): Promise<void> {
    while (!closed) {
      opts.onStatus?.("connecting");
      try {
        const opened = await source.open(credentials, bucket, key);
        if (closed) {
          await opened.close();
          break;
        }
        activeClose = opened.close;
        opts.onStatus?.("connected");
        for await (const entry of opened.entries) {
          if (closed) break;
          try {
            opts.onEntry(entry);
          } catch (err) {
            // A bug in the caller's onEntry must not look like a dropped
            // connection to the catch below - isolated here so that catch
            // stays meaningful (connection/watch errors only), and one bad
            // entry doesn't tear down an otherwise-healthy watch.
            console.error("ted1k watch: onEntry threw", err);
          }
        }
      } catch {
        // Connection/watch errors are always transient here - retried
        // below, not rethrown. onStatus is the only visibility a caller
        // gets; there's no terminal failure state for a live watch.
      }
      activeClose = null;
      if (closed) break;
      opts.onStatus?.("reconnecting");
      await delay(retryDelayMs);
    }
    opts.onStatus?.("closed");
  }

  const finished = run();

  return {
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await activeClose?.();
      await finished;
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
