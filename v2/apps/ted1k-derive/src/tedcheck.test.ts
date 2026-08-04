import { describe, expect, test } from "bun:test";
import { asTable, iso8601ify } from "./tedcheck";

describe("tedcheck", () => {
  describe("asTable", () => {
    test("converts rows into a header + value table", () => {
      const rows = [
        { since: "2019-03-12 03:40:00", watt: 500, samples: 100, missing: 0 },
      ];
      expect(asTable(rows)).toEqual([
        ["since", "watt", "samples", "missing"],
        ["2019-03-12 03:40:00", 500, 100, 0],
      ]);
    });

    test("returns an empty table for no rows", () => {
      expect(asTable([])).toEqual([]);
    });
  });

  describe("iso8601ify", () => {
    test("iso-ifies the first column of each data row, skipping the header", () => {
      const table = [
        ["since", "watt"],
        ["2019-03-12 03:40:00", 500],
      ];
      expect(iso8601ify(table)).toEqual([
        ["since", "watt"],
        ["2019-03-12T03:40:00Z", 500],
      ]);
    });
  });
});
