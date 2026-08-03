import { describe, expect, test } from "bun:test";
import { runCycle } from "./poll-cycle";
import type { CheckpointRecord } from "./logcheck";

describe("runCycle", () => {
  test("fetches, aggregates, and publishes in the {meta,data} shape", async () => {
    // Fixture shaped like the real records fetchRecent() already returns
    // (post scope==='item' filter, post destructure) - mirrors real digest
    // messages observed live against the production stream during
    // implementation.
    const records: CheckpointRecord[] = [
      {
        stamp: "2026-08-03T19:42:04.769Z",
        host: "scast-hilbert",
        digest:
          "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
      },
      {
        stamp: "2026-08-03T19:43:36.390Z",
        host: "d1-px1",
        digest:
          "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
      },
    ];

    let receivedWindowMs: number | undefined;
    const dataSource = {
      fetchRecent: async (windowMs: number) => {
        receivedWindowMs = windowMs;
        return records;
      },
    };

    const published: unknown[] = [];
    const publish = Object.assign(
      async (payload: unknown) => {
        published.push(payload);
      },
      { close: async () => {} },
    );

    await runCycle({
      dataSource,
      publish,
      windowMs: 12345,
      hostname: "test-host",
      version: {
        name: "@daneroo/qcic-scast-derive",
        version: "1.0.0",
        runtime: "bun:1.0.0",
      },
    });

    expect(receivedWindowMs).toBe(12345);
    expect(published).toHaveLength(1);

    const payload = published[0] as {
      meta: Record<string, unknown>;
      data: unknown;
    };
    expect(payload.meta.hostname).toBe("test-host");
    expect(payload.meta.type).toBe("logcheck");
    expect(typeof payload.meta.stamp).toBe("string");
    expect(payload.data).toEqual([
      ["checkpoint", "d1-px1", "scast-hilbert"],
      [
        "2026-08-03T19:40:00Z",
        "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
        "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
      ],
    ]);
  });
});
