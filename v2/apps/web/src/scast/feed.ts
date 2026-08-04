// Connects to the new NATS server's scastDigest stream and yields raw
// message bytes indefinitely, reconnecting on drop. Deliberately kept
// separate from checkpoint.ts (the pure transform) and from any
// React/component code - this module only knows "connect, hand me bytes,
// retry if it stops."

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

// Owns the connect -> consume -> (on drop) wait -> reconnect loop. Runs
// until close() is called; every other exit path (a dropped connection, a
// thrown error) is treated as transient and retried, never surfaced as a
// terminal failure - onStatus is the only way a caller observes trouble.
export function subscribe(
  credentials: ScastCredentials,
  opts: SubscribeOptions,
  source: MessageSource,
): Feed {
  const retryDelayMs = opts.retryDelayMs ?? 3000;
  let closed = false;
  let activeClose: (() => Promise<void>) | null = null;

  async function run(): Promise<void> {
    while (!closed) {
      opts.onStatus?.("connecting");
      try {
        const opened = await source.open(credentials);
        if (closed) {
          await opened.close();
          break;
        }
        activeClose = opened.close;
        opts.onStatus?.("connected");
        for await (const data of opened.messages) {
          if (closed) break;
          opts.onMessage(data);
        }
      } catch {
        // Connection/consume errors are always transient here - retried
        // below, not rethrown. onStatus is the only visibility a caller
        // gets; there's no terminal failure state for a live feed.
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
