import { describe, expect, test } from "bun:test";
import { createKvSink, type KvHandle } from "./kv-sink";
import type { ViewPayload } from "./poll";

const payload = { meta: {}, data: [] } as unknown as ViewPayload;

function fakeHandle(): KvHandle & { puts: string[]; closed: number } {
  return {
    puts: [],
    closed: 0,
    async put(key: string) {
      this.puts.push(key);
    },
    async close() {
      this.closed++;
    },
  };
}

describe("KV sink", () => {
  test("re-opens on the next publish after a failed open", async () => {
    const handle = fakeHandle();
    let opens = 0;
    const sink = createKvSink({ servers: "nats:4222" }, async () => {
      opens++;
      if (opens === 1) throw new Error("connection refused");
      return handle;
    });

    await expect(sink.publish("missingLastDay", payload)).rejects.toThrow(
      "connection refused",
    );
    await sink.publish("missingLastDay", payload);

    expect(opens).toBe(2);
    expect(handle.puts).toEqual(["missingLastDay"]);
  });

  test("opens once and reuses the handle", async () => {
    const handle = fakeHandle();
    let opens = 0;
    const sink = createKvSink({ servers: "nats:4222" }, async () => {
      opens++;
      return handle;
    });

    await sink.publish("missingLastDay", payload);
    await sink.publish("missingDayByHour", payload);

    expect(opens).toBe(1);
    expect(handle.puts).toEqual(["missingLastDay", "missingDayByHour"]);
  });

  test("close after a failed open does not throw", async () => {
    const sink = createKvSink({ servers: "nats:4222" }, async () => {
      throw new Error("getaddrinfo ENOTFOUND nats");
    });

    await expect(sink.publish("missingLastDay", payload)).rejects.toThrow();
    await expect(sink.close()).resolves.toBeUndefined();
  });

  test("close closes an open handle", async () => {
    const handle = fakeHandle();
    const sink = createKvSink({ servers: "nats:4222" }, async () => handle);

    await sink.publish("missingLastDay", payload);
    await sink.close();

    expect(handle.closed).toBe(1);
  });
});
