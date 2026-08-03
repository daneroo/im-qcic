import { describe, expect, test } from "bun:test";
import { JSONCodec } from "nats";
import { toItemRecords } from "./scrobblecast-datasource";

// Fixture messages shaped exactly like the real wire format observed live
// against the production scrobblecastDigest stream during implementation:
// {stamp, host, generation, digest, scope, elapsed}. Only
// stamp/host/digest/scope are consumed; scope==='history' is filtered out.
async function* fakeMessages(): AsyncGenerator<{ data: Uint8Array }> {
  const jc = JSONCodec();
  const raw = [
    {
      stamp: "2026-08-03T19:42:04.769Z",
      host: "scast-hilbert",
      generation: "2026-08-03T19:40:00Z",
      digest:
        "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
      scope: "item",
      elapsed: 6.228,
    },
    {
      stamp: "2026-08-03T19:42:05.230Z",
      host: "scast-hilbert",
      generation: "2026-08-03T19:40:00Z",
      digest:
        "a48098754ab694a6f31c312b81a14568a12cceec4f51b8e107740360cb4cb1cd",
      scope: "history",
      elapsed: 0.461,
    },
    {
      stamp: "2026-08-03T19:43:36.390Z",
      host: "d1-px1",
      generation: "2026-08-03T19:40:00Z",
      digest:
        "03cad5a63fcc19e425510fe22c259d081ea7783ef0ae9e4d4a71b7eb983076e8",
      scope: "item",
      elapsed: 11.522,
    },
  ];
  for (const m of raw) {
    yield { data: jc.encode(m) };
  }
}

describe("toItemRecords", () => {
  test("decodes and filters to scope==='item' CheckpointRecords", async () => {
    const records = [];
    for await (const record of toItemRecords(fakeMessages())) {
      records.push(record);
    }

    expect(records).toEqual([
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
    ]);
  });
});
