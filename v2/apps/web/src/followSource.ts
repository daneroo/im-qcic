import type { ConnectionState } from "./components/marks";

export interface OpenedSource<T> {
  values: AsyncIterable<T>;
  close(): Promise<void>;
}

export interface FollowedSource {
  close(): Promise<void>;
}

export function followSource<T>(options: {
  open(): Promise<OpenedSource<T>>;
  onValue(value: T): void;
  onStatus?(status: ConnectionState): void;
  consumerName: string;
  retryDelayMs?: number;
}): FollowedSource {
  const retryDelayMs = options.retryDelayMs ?? 3_000;
  let closed = false;
  let closeActive: (() => Promise<void>) | null = null;

  async function run(): Promise<void> {
    while (!closed) {
      options.onStatus?.("connecting");
      try {
        const opened = await options.open();
        if (closed) {
          await opened.close();
          break;
        }
        closeActive = opened.close;
        options.onStatus?.("connected");
        for await (const value of opened.values) {
          if (closed) break;
          try {
            options.onValue(value);
          } catch (error) {
            console.error(`${options.consumerName}: consumer threw`, error);
          }
        }
      } catch {
        // Opening and dropped-source failures are transient for live feeds.
      }
      closeActive = null;
      if (closed) break;
      options.onStatus?.("reconnecting");
      await delay(retryDelayMs);
    }
    options.onStatus?.("closed");
  }

  const finished = run();

  return {
    async close() {
      if (closed) return;
      closed = true;
      await closeActive?.();
      await finished;
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
