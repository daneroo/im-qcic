import type { ConnectionState } from "../components/marks";
import { followSource } from "../followSource";

export type HealthEvent =
  | { kind: "public"; data: Uint8Array }
  | { kind: "detail"; key: "nats" | "tailnet"; data: Uint8Array };

export interface HealthSource {
  open(credentials: { servers: string }): Promise<OpenedHealthSource>;
}

export interface OpenedHealthSource {
  events: AsyncIterable<HealthEvent>;
  close(): Promise<void>;
}

export interface HealthFeed {
  close(): Promise<void>;
}

export function followHealth(
  credentials: { servers: string },
  options: {
    onEvent(event: HealthEvent): void;
    onStatus?(status: ConnectionState): void;
    retryDelayMs?: number;
  },
  source: HealthSource,
): HealthFeed {
  return followSource({
    async open() {
      const opened = await source.open(credentials);
      return {
        values: opened.events,
        close: () => opened.close(),
      };
    },
    onValue: options.onEvent,
    onStatus: options.onStatus,
    consumerName: "health feed",
    retryDelayMs: options.retryDelayMs,
  });
}
