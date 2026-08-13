import { describe, expect, test } from "bun:test";
import { decodeDecimalBuffers } from "./ted1k-datasource";

describe("decodeDecimalBuffers", () => {
  test("decodes DECIMAL columns Bun's mysql client returns as Buffer", () => {
    // round(avg(watt),0) - a MySQL DECIMAL - comes back as a Buffer of its
    // string representation, e.g. Buffer.from("1919") for watt=1919.
    const row = {
      since: "2019-03-12 03:40:00",
      watt: Buffer.from("1919"),
      samples: 86333,
      missing: 67,
    };
    expect(decodeDecimalBuffers(row)).toEqual({
      since: "2019-03-12 03:40:00",
      watt: "1919",
      samples: 86333,
      missing: 67,
    });
  });

  test("passes through rows with no Buffer columns unchanged", () => {
    const row = { since: "2019-03-12 03:40:00", samples: 100, missing: 0 };
    expect(decodeDecimalBuffers(row)).toEqual(row);
  });
});
