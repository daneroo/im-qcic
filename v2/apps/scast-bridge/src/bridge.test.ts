import { describe, expect, test } from "bun:test";
import { run, type BridgeMessage } from "./bridge";

describe("run", () => {
  test("republishes every message byte-for-byte, with a rewritten subject and a stable dedup id, then acks", async () => {
    const acked: number[] = [];
    const messages: BridgeMessage[] = [
      {
        subject: "im.scrobblecast.scrape.digest",
        data: new TextEncoder().encode('{"host":"darwin"}'),
        seq: 1294736,
        ack: () => acked.push(1294736),
      },
      {
        subject: "im.scrobblecast.scrape.digest",
        data: new TextEncoder().encode('{"host":"d1-px1"}'),
        seq: 1294737,
        ack: () => acked.push(1294737),
      },
    ];

    async function* fakeMessages(): AsyncGenerator<BridgeMessage> {
      for (const m of messages) yield m;
    }

    const published: { subject: string; data: Uint8Array; msgId: string }[] =
      [];
    const sink = {
      publish: async (subject: string, data: Uint8Array, msgId: string) => {
        published.push({ subject, data, msgId });
      },
    };

    const copied: BridgeMessage[] = [];

    await run({
      messages: fakeMessages(),
      sink,
      rewriteSubject: (s) => s.replace("scrobblecast", "scast"),
      msgIdPrefix: "scrobblecastDigest",
      onCopy: (m) => copied.push(m),
    });

    expect(published).toHaveLength(2);
    expect(published[0]!.subject).toBe("im.scast.scrape.digest");
    expect(published[0]!.data).toBe(messages[0]!.data); // byte-for-byte, same reference, no re-encode
    expect(published[0]!.msgId).toBe("scrobblecastDigest-1294736");
    expect(published[1]!.msgId).toBe("scrobblecastDigest-1294737");

    expect(acked).toEqual([1294736, 1294737]);
    expect(copied).toHaveLength(2);
  });
});
