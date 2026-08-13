import { describe, expect, test } from "bun:test";
import { pollView } from "./poll";
import { queries, type Row } from "./ted1k";
import type { Ted1kDataSource } from "./ted1k-datasource";

function fakeDatasource(rowsBySql: Record<string, Row[]>): Ted1kDataSource {
  return {
    async query(sql: string): Promise<Row[]> {
      return rowsBySql[sql] ?? [];
    },
  };
}

const version = { name: "test", version: "0.0.0", runtime: "test" };

describe("pollView", () => {
  test("queries only the given view and publishes a self-contained {meta,data} payload", async () => {
    const datasource = fakeDatasource({
      [queries.missingLastDay]: [
        { since: "2019-03-12 03:40:00", watt: 500, samples: 100, missing: 0 },
      ],
    });

    const published: Array<{ view: string; data: unknown }> = [];
    const payload = await pollView("missingLastDay", {
      datasource,
      publish: async (view, p) => {
        published.push({ view, data: p });
      },
      hostname: "test-host",
      version,
      now: () => new Date("2026-08-04T12:00:00Z"),
    });

    expect(payload).toEqual({
      meta: {
        stamp: "2026-08-04T12:00:00.000Z",
        hostname: "test-host",
        version,
        type: "ted1k",
        view: "missingLastDay",
      },
      data: [
        ["since", "watt", "samples", "missing"],
        ["2019-03-12T03:40:00Z", 500, 100, 0],
      ],
    });
    expect(published).toEqual([{ view: "missingLastDay", data: payload }]);
  });

  test("returns an empty table when the view's query has no rows", async () => {
    const datasource = fakeDatasource({});

    const payload = await pollView("missingWeekByDay", {
      datasource,
      publish: async () => {},
      hostname: "test-host",
      version,
    });

    expect(payload.data).toEqual([]);
    expect(payload.meta.view).toBe("missingWeekByDay");
  });
});
