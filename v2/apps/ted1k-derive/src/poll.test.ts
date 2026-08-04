import { describe, expect, test } from "bun:test";
import { pollOnce, type TedcheckPayload } from "./poll";
import { queries, type Row } from "./tedcheck";
import type { TedcheckDataSource } from "./tedcheck-datasource";

function fakeDatasource(rowsBySql: Record<string, Row[]>): TedcheckDataSource {
  return {
    async query(sql: string): Promise<Row[]> {
      return rowsBySql[sql] ?? [];
    },
  };
}

const version = { name: "test", version: "0.0.0", runtime: "test" };

describe("pollOnce", () => {
  test("queries all three tedcheck views and publishes the {meta,data} shape", async () => {
    const datasource = fakeDatasource({
      [queries.missingLastDay]: [
        { since: "2019-03-12 03:40:00", watt: 500, samples: 100, missing: 0 },
      ],
      [queries.missingWeekByDay]: [
        { day: "2019-03-12 00:00:00", watt: 400, samples: 86333, missing: 67 },
      ],
      [queries.missingDayByHour]: [
        { hour: "2019-03-12 03:00", watt: 450, samples: 3600, missing: 0 },
      ],
    });

    const published: TedcheckPayload[] = [];
    await pollOnce({
      datasource,
      publish: async (payload) => {
        published.push(payload);
      },
      hostname: "test-host",
      version,
      now: () => new Date("2026-08-04T12:00:00Z"),
    });

    expect(published).toEqual([
      {
        meta: {
          stamp: "2026-08-04T12:00:00.000Z",
          hostname: "test-host",
          version,
          type: "tedcheck",
        },
        data: {
          missingLastDay: [
            ["since", "watt", "samples", "missing"],
            ["2019-03-12T03:40:00Z", 500, 100, 0],
          ],
          missingWeekByDay: [
            ["day", "watt", "samples", "missing"],
            ["2019-03-12T00:00:00Z", 400, 86333, 67],
          ],
          missingDayByHour: [
            ["hour", "watt", "samples", "missing"],
            ["2019-03-12T03:00Z", 450, 3600, 0],
          ],
        },
      },
    ]);
  });

  test("returns an empty table for a view with no rows", async () => {
    const datasource = fakeDatasource({});

    const payload = await pollOnce({
      datasource,
      publish: async () => {},
      hostname: "test-host",
      version,
    });

    expect(payload.data).toEqual({
      missingLastDay: [],
      missingWeekByDay: [],
      missingDayByHour: [],
    });
  });
});
