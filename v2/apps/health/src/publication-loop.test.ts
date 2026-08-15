import { describe, expect, test } from "bun:test";
import type { HealthObserver } from "./health";
import type { HealthPublisher } from "./publish";
import { createPublicationLoop } from "./publication-loop";
import type { PublicHealth } from "./types";

const READING: PublicHealth = {
  schema: 1,
  observer: "syno",
  tailnet: { available: false, observedAt: "2026-08-15T14:02:29.000Z" },
  nats: { available: true, observedAt: "2026-08-15T14:02:31.000Z" },
};

const health: HealthObserver = {
  read: async () => READING,
  latestNats: () => null,
  latestTailnet: () => null,
};

describe("health publication loop", () => {
  test("keeps retryable NATS publication state outside the health observer", async () => {
    let reads = 0;
    const observedHealth: HealthObserver = {
      ...health,
      read: async () => {
        reads++;
        return READING;
      },
    };
    let connects = 0;
    let publications = 0;
    let closes = 0;
    const errors: string[] = [];
    const publisher: HealthPublisher = {
      publishPublic: async () => {
        publications++;
      },
      publishNats: async () => undefined,
      publishTailnet: async () => undefined,
      close: async () => {
        closes++;
      },
    };
    const loop = createPublicationLoop({
      health: observedHealth,
      connect: async () => {
        connects++;
        if (connects === 1) throw new Error("NATS unavailable");
        return publisher;
      },
      onError: (error) => errors.push((error as Error).message),
    });

    await loop.tick();
    expect(reads).toBe(1);
    await expect(health.read()).resolves.toEqual(READING);
    await loop.tick();
    await loop.tick();
    await loop.close();

    expect(errors).toEqual(["NATS unavailable"]);
    expect(connects).toBe(2);
    expect(publications).toBe(2);
    expect(closes).toBe(1);
  });

  test("coalesces overlapping timer ticks", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let publications = 0;
    const loop = createPublicationLoop({
      health,
      connect: async () => ({
        publishPublic: async () => {
          publications++;
          await gate;
        },
        publishNats: async () => undefined,
        publishTailnet: async () => undefined,
        close: async () => undefined,
      }),
      onError: () => undefined,
    });

    const first = loop.tick();
    const second = loop.tick();
    await Bun.sleep(0);
    expect(publications).toBe(1);
    release();
    await Promise.all([first, second]);
    expect(publications).toBe(1);
  });

  test("discards a failed publisher so the next tick reconnects", async () => {
    let connects = 0;
    let failedPublisherClosed = false;
    let recoveredPublications = 0;
    const loop = createPublicationLoop({
      health,
      connect: async () => {
        connects++;
        if (connects === 1) {
          return {
            publishPublic: async () => {
              throw new Error("publish timed out");
            },
            publishNats: async () => undefined,
            publishTailnet: async () => undefined,
            close: async () => {
              failedPublisherClosed = true;
            },
          };
        }
        return {
          publishPublic: async () => {
            recoveredPublications++;
          },
          publishNats: async () => undefined,
          publishTailnet: async () => undefined,
          close: async () => undefined,
        };
      },
      onError: () => undefined,
    });

    await loop.tick();
    await loop.tick();
    await loop.close();

    expect(failedPublisherClosed).toBe(true);
    expect(connects).toBe(2);
    expect(recoveredPublications).toBe(1);
  });
});
