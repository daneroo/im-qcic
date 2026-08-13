import { describe, expect, test } from "bun:test";
import { deriveView } from "./derive";
import type { Ted1kViewPayload } from "./types";

function payload(
  data: Ted1kViewPayload["data"],
  stamp = "2026-08-08T21:46:42.000Z",
): Ted1kViewPayload {
  return {
    meta: {
      stamp,
      hostname: "ted1k-derive",
      version: { name: "ted1k-derive", version: "1", runtime: "bun" },
      type: "ted1k",
      view: "missingDayByHour",
    },
    data,
  };
}

describe("deriveView", () => {
  test("corrects the two rolling-window boundary rows from the known live example", () => {
    const reading = deriveView(
      "missingDayByHour",
      payload([
        ["hour", "watt", "samples", "missing"],
        ["2026-08-07T21:00:00Z", "700", 797, 2803],
        ["2026-08-08T21:00:00Z", "710", 2803, 797],
      ]),
    );

    expect(reading?.buckets.map(({ missing }) => missing)).toEqual([1, 0]);
  });

  test("marks only complete hour buckets over the fixed one-minute threshold as significant", () => {
    const reading = deriveView(
      "missingDayByHour",
      payload(
        [
          ["hour", "watt", "samples", "missing"],
          ["2026-08-08T19:00:00Z", "700", 3540, 60],
          ["2026-08-08T20:00:00Z", "710", 3539, 61],
        ],
        "2026-08-08T22:00:00.000Z",
      ),
    );

    expect(reading?.buckets.map(({ significant }) => significant)).toEqual([
      false,
      true,
    ]);
  });

  test("names the largest gap from complete buckets", () => {
    const reading = deriveView(
      "missingDayByHour",
      payload([
        ["hour", "watt", "samples", "missing"],
        ["2026-08-07T21:00:00Z", "700", 797, 2803],
        ["2026-08-08T19:00:00Z", "705", 3480, 120],
        ["2026-08-08T20:00:00Z", "710", 3540, 60],
      ]),
    );

    expect(reading?.worst?.start.toISOString()).toBe(
      "2026-08-08T19:00:00.000Z",
    );
    expect(reading?.worst?.missing).toBe(120);
  });

  test("marks clipped boundary buckets partial and never includes them among significant gaps", () => {
    const reading = deriveView(
      "missingDayByHour",
      payload([
        ["hour", "watt", "samples", "missing"],
        ["2026-08-07T21:00:00Z", "700", 100, 3500],
        ["2026-08-08T19:00:00Z", "705", 3480, 120],
      ]),
    );

    expect(reading?.buckets[0]).toMatchObject({
      partial: true,
      significant: false,
    });
    expect(reading?.significantGaps.map(({ missing }) => missing)).toEqual([
      120,
    ]);
  });
});
