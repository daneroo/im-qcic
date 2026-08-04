import { describe, expect, test } from "bun:test";
import {
  subscribe,
  type FeedStatus,
  type MessageSource,
  type OpenedSource,
} from "./feed";

// A fake MessageSource whose open() calls are scripted: each call returns
// the next entry in `opens`, so tests can simulate a connection dropping
// mid-stream and a fresh connection succeeding on retry.
function fakeSource(opens: Array<() => OpenedSource>): MessageSource & {
  openCalls: number;
} {
  let calls = 0;
  return {
    get openCalls() {
      return calls;
    },
    async open() {
      const make = opens[calls];
      calls++;
      if (!make) throw new Error("fakeSource: no more scripted opens");
      return make();
    },
  };
}

function closableMessages(
  data: Uint8Array[],
  opts: { closeSignal?: { closed: boolean } } = {},
): OpenedSource {
  const closeSignal = opts.closeSignal ?? { closed: false };
  return {
    messages: {
      async *[Symbol.asyncIterator]() {
        for (const d of data) {
          if (closeSignal.closed) return;
          yield d;
        }
        // Simulates a healthy connection idling forever (never "completes"
        // on its own) - only close() (below) ends it, mirroring a real
        // consume() iterator.
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (closeSignal.closed) {
              clearInterval(check);
              resolve();
            }
          }, 5);
        });
      },
    },
    close: async () => {
      closeSignal.closed = true;
    },
  };
}

describe("subscribe", () => {
  test("delivers messages from the source to onMessage", async () => {
    const messages: Uint8Array[] = [];
    const source = fakeSource([
      () => closableMessages([new Uint8Array([1]), new Uint8Array([2])]),
    ]);

    const feed = subscribe(
      { servers: "ws://fake" },
      { onMessage: (data) => messages.push(data) },
      source,
    );

    await waitFor(() => messages.length === 2);
    expect(messages).toEqual([new Uint8Array([1]), new Uint8Array([2])]);

    await feed.close();
  });

  test("reports status transitions: connecting -> connected -> closed", async () => {
    const statuses: FeedStatus[] = [];
    const source = fakeSource([() => closableMessages([])]);

    const feed = subscribe(
      { servers: "ws://fake" },
      { onMessage: () => {}, onStatus: (s) => statuses.push(s) },
      source,
    );

    await waitFor(() => statuses.includes("connected"));
    await feed.close();

    expect(statuses).toEqual(["connecting", "connected", "closed"]);
  });

  test("reconnects when the message stream ends unexpectedly", async () => {
    const statuses: FeedStatus[] = [];
    const messages: Uint8Array[] = [];
    const source = fakeSource([
      // First "connection": delivers one message, then its iterable ends
      // on its own (simulating a dropped connection) rather than via close().
      () => ({
        messages: {
          async *[Symbol.asyncIterator]() {
            yield new Uint8Array([1]);
            // ends here - simulates the connection dropping
          },
        },
        close: async () => {},
      }),
      // Second connection: succeeds, delivers another message.
      () => closableMessages([new Uint8Array([2])]),
    ]);

    const feed = subscribe(
      { servers: "ws://fake" },
      {
        onMessage: (d) => messages.push(d),
        onStatus: (s) => statuses.push(s),
        retryDelayMs: 5,
      },
      source,
    );

    await waitFor(() => messages.length === 2);
    expect(messages).toEqual([new Uint8Array([1]), new Uint8Array([2])]);
    expect(statuses).toContain("reconnecting");
    expect(source.openCalls).toBe(2);

    await feed.close();
  });

  test("close() stops the retry loop and awaits the active connection's close", async () => {
    let closed = false;
    // Models a real consumer: its iterator only ends once the connection is
    // actually closed - `hang` blocks the generator until close() below
    // releases it, so the test can observe that close() really unblocks it
    // rather than abandoning it mid-iteration.
    let releaseHang: () => void = () => {};
    const hang = new Promise<void>((resolve) => {
      releaseHang = resolve;
    });
    // Not a generator (no yield) - an object literal, since this iterator
    // never produces a value, only ends once `hang` resolves.
    const source = fakeSource([
      () => ({
        messages: {
          [Symbol.asyncIterator]() {
            return {
              next: () =>
                hang.then(() => ({ value: undefined, done: true }) as const),
            };
          },
        },
        close: async () => {
          closed = true;
          releaseHang();
        },
      }),
    ]);

    const feed = subscribe(
      { servers: "ws://fake" },
      { onMessage: () => {} },
      source,
    );

    await waitFor(() => source.openCalls === 1);
    await feed.close();

    expect(closed).toBe(true);
  });
});

async function waitFor(
  condition: () => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor: timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
