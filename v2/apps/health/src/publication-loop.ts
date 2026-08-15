import type { HealthObserver } from "./health";
import { publishHealthReading, type HealthPublisher } from "./publish";

export interface PublicationLoop {
  tick(): Promise<void>;
  close(): Promise<void>;
}

export function createPublicationLoop(options: {
  health: HealthObserver;
  connect(): Promise<HealthPublisher>;
  onError(error: unknown): void;
}): PublicationLoop {
  let publisher: HealthPublisher | null = null;
  let inFlight: Promise<void> | null = null;
  let closed = false;

  async function tickOnce(): Promise<void> {
    try {
      const reading = await options.health.read();
      publisher ??= await options.connect();
      await publishHealthReading(options.health, publisher, reading);
    } catch (error) {
      options.onError(error);
      if (publisher) {
        try {
          await publisher.close();
        } catch (closeError) {
          options.onError(closeError);
        }
        publisher = null;
      }
    }
  }

  return {
    tick() {
      if (closed) return Promise.resolve();
      if (!inFlight) {
        inFlight = tickOnce().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
    async close() {
      closed = true;
      await inFlight;
      if (publisher) {
        await publisher.close();
        publisher = null;
      }
    },
  };
}
