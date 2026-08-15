import { describe, expect, test } from "bun:test";
import { followHealth, type HealthEvent, type HealthSource } from "./feed";

async function* events(values: HealthEvent[]): AsyncGenerator<HealthEvent> {
  yield* values;
}

describe("followHealth", () => {
  test("delivers public and private events and reconnects after a dropped source", async () => {
    let opens = 0;
    let release: () => void = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const source: HealthSource = {
      async open() {
        opens++;
        if (opens === 1) {
          return {
            events: events([{ kind: "public", data: new Uint8Array([1]) }]),
            close: async () => undefined,
          };
        }
        return {
          events: (async function* () {
            yield {
              kind: "detail" as const,
              key: "nats",
              data: new Uint8Array([2]),
            };
            await hold;
          })(),
          close: async () => {
            release();
          },
        };
      },
    };
    const received: HealthEvent[] = [];
    const statuses: string[] = [];
    const feed = followHealth(
      { servers: "ws://nats" },
      {
        retryDelayMs: 0,
        onEvent: (event) => received.push(event),
        onStatus: (status) => statuses.push(status),
      },
      source,
    );

    while (received.length < 2) await Bun.sleep(0);
    await feed.close();

    expect(received.map(({ kind }) => kind)).toEqual(["public", "detail"]);
    expect(opens).toBe(2);
    expect(statuses).toContain("reconnecting");
    expect(statuses.at(-1)).toBe("closed");
  });
});
