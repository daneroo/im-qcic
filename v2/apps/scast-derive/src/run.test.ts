import { describe, expect, test } from "bun:test";
import { run } from "./run";
import type { CheckpointRecord } from "./digest";

describe("run", () => {
  test("republishes on every arrival, pruning records as they age out of windowMs", async () => {
    const t0 = new Date("2026-08-03T20:00:00Z").getTime();
    const windowMs = 60 * 60_000; // 1h

    // Simulated wall clock: advances 40min between each arrival, so the
    // first record (fresh at arrival) is still within the 1h window on the
    // second arrival, but has aged out by the third.
    let simulatedNow = t0;
    const now = () => new Date(simulatedNow);

    async function* fakeRecords(): AsyncGenerator<CheckpointRecord> {
      yield {
        stamp: new Date(simulatedNow).toISOString(),
        host: "host-a",
        digest: "digest-1",
      };
      simulatedNow += 40 * 60_000;
      yield {
        stamp: new Date(simulatedNow).toISOString(),
        host: "host-b",
        digest: "digest-1",
      };
      simulatedNow += 40 * 60_000;
      yield {
        stamp: new Date(simulatedNow).toISOString(),
        host: "host-a",
        digest: "digest-2",
      };
    }

    const published: unknown[] = [];
    const publish = Object.assign(
      async (payload: unknown) => {
        published.push(payload);
      },
      { close: async () => {} },
    );

    await run({
      records: fakeRecords(),
      publish,
      windowMs,
      hostname: "test-host",
      now,
      version: {
        name: "@daneroo/qcic-scast-derive",
        version: "1.0.0",
        runtime: "bun:1.0.0",
      },
    });

    expect(published).toHaveLength(3); // one publish per arrival

    const first = published[0] as {
      meta: Record<string, unknown>;
      data: unknown;
    };
    expect(first.meta.hostname).toBe("test-host");
    expect(first.meta.type).toBe("digest");
    // just host-a's first record, well within the window
    expect(first.data).toEqual([
      ["checkpoint", "host-a"],
      [expect.any(String), "digest-1"],
    ]);

    const second = published[1] as { data: unknown };
    // 40min later: host-a's record (40min old) is still within the 1h
    // window, host-b's just arrived - different 10min buckets (20:00 vs
    // 20:40), so two separate rows, most recent first
    expect(second.data).toEqual([
      ["checkpoint", "host-a", "host-b"],
      [expect.any(String), "", "digest-1"],
      [expect.any(String), "digest-1", ""],
    ]);

    const third = published[2] as { data: unknown };
    // another 40min later (80min total): host-a's original record is now
    // 80min old, outside the 1h window, and has been pruned - only the
    // two records still within the window remain
    expect(third.data).toEqual([
      ["checkpoint", "host-a", "host-b"],
      [expect.any(String), "digest-2", ""],
      [expect.any(String), "", "digest-1"],
    ]);
  });
});
