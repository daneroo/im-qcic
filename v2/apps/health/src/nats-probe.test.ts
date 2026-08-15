import { describe, expect, test } from "bun:test";
import { createNatsProbe } from "./nats-probe";

describe("NATS monitoring probe", () => {
  test("selects only the private fields used by QCIC from varz and connz", async () => {
    const requested: string[] = [];
    const probe = createNatsProbe({
      baseUrl: "http://nats:8222",
      timeoutMs: 1_000,
      fetch: async (input) => {
        const url = String(input);
        requested.push(url);
        if (url.endsWith("/varz")) {
          return Response.json({
            server_id: "secret-internal-id",
            server_name: "nats-1",
            version: "2.14.4",
            uptime: "11m38s",
            connections: 99,
            subscriptions: 162,
            in_msgs: 226,
            out_msgs: 422,
            slow_consumers: 0,
            jetstream: { stats: { memory: 12, storage: 3303 } },
            routes: [{ ip: "must-not-leak" }],
          });
        }
        return Response.json({
          num_connections: 59,
          connections: [{ ip: "must-not-leak", subscriptions_list: ["foo"] }],
        });
      },
    });

    await expect(probe()).resolves.toEqual({
      serverName: "nats-1",
      version: "2.14.4",
      uptime: "11m38s",
      connections: 59,
      subscriptions: 162,
      inMessages: 226,
      outMessages: 422,
      slowConsumers: 0,
      jetstreamMemoryBytes: 12,
      jetstreamStorageBytes: 3303,
    });
    expect(requested).toEqual([
      "http://nats:8222/varz",
      "http://nats:8222/connz?subs=0",
    ]);
  });

  test("shortens the generated server ID used as the default name", async () => {
    const probe = createNatsProbe({
      baseUrl: "http://nats:8222",
      timeoutMs: 1_000,
      fetch: async (input) =>
        String(input).endsWith("/varz")
          ? Response.json({
              server_id: "NGENERATEDINTERNALID",
              server_name: "NGENERATEDINTERNALID",
              version: "2.14.4",
              uptime: "1m",
              subscriptions: 2,
              in_msgs: 3,
              out_msgs: 4,
              slow_consumers: 0,
            })
          : Response.json({ num_connections: 1 }),
    });

    expect((await probe()).serverName).toBe("NGENERAT…ALID");
  });
});
