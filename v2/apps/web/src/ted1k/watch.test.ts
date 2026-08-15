import { describe, expect, test } from "bun:test";
import {
  watchKey,
  type KvEntrySource,
  type OpenedKvEntries,
  type WatchStatus,
} from "./watch";
import type { KvWatchEntry } from "@nats-io/kv";

function fakeEntry(value: string, revision: number): KvWatchEntry {
  return {
    bucket: "im-ted1k-derive",
    key: "missingLastDay",
    value: new TextEncoder().encode(value),
    created: new Date(),
    revision,
    operation: "PUT",
    length: value.length,
    rawKey: "missingLastDay",
    isUpdate: revision > 1,
    json: <T>() => JSON.parse(value) as T,
    string: () => value,
  };
}

// A fake KvEntrySource whose open() calls are scripted: each call returns
// the next entry in `opens`, so tests can simulate a connection dropping
// mid-watch and a fresh connection succeeding on retry.
function fakeSource(opens: Array<() => OpenedKvEntries>): KvEntrySource & {
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

function closableEntries(
  entries: KvWatchEntry[],
  opts: { closeSignal?: { closed: boolean } } = {},
): OpenedKvEntries {
  const closeSignal = opts.closeSignal ?? { closed: false };
  return {
    entries: {
      async *[Symbol.asyncIterator]() {
        for (const e of entries) {
          if (closeSignal.closed) return;
          yield e;
        }
        // Simulates a healthy watch idling forever (never "completes" on
        // its own) - only close() (below) ends it, mirroring a real
        // watch() iterator.
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

describe("watchKey", () => {
  test("delivers entries from the source to onEntry", async () => {
    const entries: KvWatchEntry[] = [];
    const source = fakeSource([
      () => closableEntries([fakeEntry('{"a":1}', 1), fakeEntry('{"a":2}', 2)]),
    ]);

    const watch = watchKey(
      { servers: "ws://fake" },
      "im-ted1k-derive",
      "missingLastDay",
      { onEntry: (e) => entries.push(e) },
      source,
    );

    await waitFor(() => entries.length === 2);
    expect(entries.map((e) => e.revision)).toEqual([1, 2]);

    await watch.close();
  });

  test("reports status transitions: connecting -> connected -> closed", async () => {
    const statuses: WatchStatus[] = [];
    const source = fakeSource([() => closableEntries([])]);

    const watch = watchKey(
      { servers: "ws://fake" },
      "im-ted1k-derive",
      "missingLastDay",
      { onEntry: () => {}, onStatus: (s) => statuses.push(s) },
      source,
    );

    await waitFor(() => statuses.includes("connected"));
    await watch.close();

    expect(statuses).toEqual(["connecting", "connected", "closed"]);
  });

  test("reconnects when the watch ends unexpectedly", async () => {
    const statuses: WatchStatus[] = [];
    const entries: KvWatchEntry[] = [];
    const source = fakeSource([
      // First "connection": delivers one entry, then its iterable ends on
      // its own (simulating a dropped connection) rather than via close().
      () => ({
        entries: {
          async *[Symbol.asyncIterator]() {
            yield fakeEntry('{"a":1}', 1);
            // ends here - simulates the connection dropping
          },
        },
        close: async () => {},
      }),
      // Second connection: succeeds, delivers another entry.
      () => closableEntries([fakeEntry('{"a":2}', 2)]),
    ]);

    const watch = watchKey(
      { servers: "ws://fake" },
      "im-ted1k-derive",
      "missingLastDay",
      {
        onEntry: (e) => entries.push(e),
        onStatus: (s) => statuses.push(s),
        retryDelayMs: 5,
      },
      source,
    );

    await waitFor(() => entries.length === 2);
    expect(entries.map((e) => e.revision)).toEqual([1, 2]);
    expect(statuses).toContain("reconnecting");
    expect(source.openCalls).toBe(2);

    await watch.close();
  });

  test("close() stops the retry loop and awaits the active connection's close", async () => {
    let closed = false;
    // Models a real watch: its iterator only ends once the connection is
    // actually closed - `hang` blocks it until close() below releases it.
    let releaseHang: () => void = () => {};
    const hang = new Promise<void>((resolve) => {
      releaseHang = resolve;
    });
    const source = fakeSource([
      () => ({
        entries: {
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

    const watch = watchKey(
      { servers: "ws://fake" },
      "im-ted1k-derive",
      "missingLastDay",
      { onEntry: () => {} },
      source,
    );

    await waitFor(() => source.openCalls === 1);
    await watch.close();

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
