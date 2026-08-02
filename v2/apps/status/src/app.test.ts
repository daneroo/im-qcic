import { describe, expect, test } from "bun:test";
import { app, createApp } from "./app";
import { config } from "./config";
import type { LogglyDataSource } from "./logcheck-datasource";
import type { Row } from "./tedcheck";
import type { TedcheckDataSource } from "./tedcheck-datasource";

describe("@daneroo/qcic-status", () => {
  test("GET / returns the version object", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(config.version);
  });

  test("GET /api/version returns stamp, hostname, version, type", async () => {
    const res = await app.request("/api/version");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stamp: string;
      hostname: string;
      version: typeof config.version;
      type: string;
    };
    expect(body).toMatchObject({
      hostname: config.hostname,
      version: config.version,
      type: "version",
    });
    expect(() => new Date(body.stamp).toISOString()).not.toThrow();
  });

  test("GET /api/tedcheck returns meta + iso8601-ified data per query", async () => {
    const rowsByCallOrder: Row[][] = [
      [{ since: "2019-03-12 03:40:00", watt: 500, samples: 100, missing: 0 }],
      [{ day: "2019-03-12 00:00:00", watt: 480, samples: 86000, missing: 400 }],
      [{ hour: "2019-03-12 03:00:00", watt: 490, samples: 3500, missing: 100 }],
    ];
    let call = 0;
    const fakeTedcheck: TedcheckDataSource = {
      async query() {
        return rowsByCallOrder[call++]!;
      },
    };
    const testApp = createApp({ tedcheck: fakeTedcheck });

    const res = await testApp.request("/api/tedcheck");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      meta: { type: string; hostname: string };
      data: Record<string, (string | number | null)[][]>;
    };

    expect(body.meta).toMatchObject({
      type: "tedcheck",
      hostname: config.hostname,
    });
    expect(body.data.missingLastDay).toEqual([
      ["since", "watt", "samples", "missing"],
      ["2019-03-12T03:40:00Z", 500, 100, 0],
    ]);
    expect(body.data.missingWeekByDay).toEqual([
      ["day", "watt", "samples", "missing"],
      ["2019-03-12T00:00:00Z", 480, 86000, 400],
    ]);
    expect(body.data.missingDayByHour).toEqual([
      ["hour", "watt", "samples", "missing"],
      ["2019-03-12T03:00:00Z", 490, 3500, 100],
    ]);
  });

  test("GET /api/logcheck returns meta + aggregated checkpoint digests", async () => {
    const fakeLogcheck: LogglyDataSource = {
      async search() {
        return [
          {
            timestamp: "2019-03-12T03:52:19.279Z",
            tags: ["pocketscrape", "host-newton.imetrical.com"],
            event: { json: { digest: "abc1234" } },
          },
        ];
      },
    };
    const testApp = createApp({ logcheck: fakeLogcheck });

    const res = await testApp.request("/api/logcheck");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      meta: { type: string; hostname: string };
      data: (string | null)[][];
    };

    expect(body.meta).toMatchObject({
      type: "logcheck",
      hostname: config.hostname,
    });
    expect(body.data).toEqual([
      ["checkpoint", "newton.imetrical.com"],
      ["2019-03-12T03:50:00Z", "abc1234"],
    ]);
  });
});
