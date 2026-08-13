import { describe, expect, test } from "bun:test";
import {
  formatDuration,
  formatMissing,
  formatSeconds,
  since,
} from "./duration";

describe("formatMissing — the canonical rule", () => {
  test.each([
    // 1. the largest unit that fits
    [49, "49s"],
    [60, "1m"],
    [3600, "1h"],
    [86400, "1d"],
    // 2. leading segment unpadded, later ones padded to two digits
    [62, "1m02s"],
    [3660, "1h01m"],
    [3663, "1h01m03s"],
    [7200, "2h"],
    [90000, "1d01h"],
    // 3. trailing zero segments dropped
    [50340, "13h59m"],
    [86460, "1d00h01m"],
    // 4. interior zero segments kept
    [7203, "2h00m03s"],
    [86403, "1d00h00m03s"],
  ])("%p seconds is %p", (seconds, expected) => {
    expect(formatMissing(seconds)).toBe(expected);
  });

  test("nothing missing is a word, not a zero", () => {
    expect(formatMissing(0)).toBe("none");
    expect(formatMissing(-1)).toBe("none");
  });

  test("fractional seconds round to whole ones", () => {
    expect(formatMissing(61.4)).toBe("1m01s");
    expect(formatMissing(61.6)).toBe("1m02s");
    expect(formatMissing(0.4)).toBe("none"); // rounds away to nothing
    expect(formatMissing(0.6)).toBe("1s");
  });

  test("a non-number is not a duration", () => {
    expect(formatMissing(Number.NaN)).toBe("none");
    expect(formatMissing(Number.POSITIVE_INFINITY)).toBe("none");
  });

  test("the shape holds as the quantity grows", () => {
    // Rule 2 exists so a column of these stays readable; each is one second
    // longer than the last.
    expect([59, 60, 61, 3599, 3600, 3601].map(formatMissing)).toEqual([
      "59s",
      "1m",
      "1m01s",
      "59m59s",
      "1h",
      "1h00m01s",
    ]);
  });
});

describe("formatDuration — the millisecond adapter", () => {
  test.each([
    [228_000, "3m48s"],
    [7_620_000, "2h07m"], // the old minute cap printed "127m"
    [7_203_000, "2h00m03s"],
    [86_400_000, "1d"],
  ])("%p ms is %p", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  test("prints the same shapes as the canonical rule", () => {
    for (const seconds of [49, 60, 62, 3600, 3663, 7203, 50340, 90000]) {
      expect(formatDuration(seconds * 1000)).toBe(formatMissing(seconds));
    }
  });

  test("a lag under half a second is 0s, not none", () => {
    // A copy that reported within half a second of its generation did report.
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(400)).toBe("0s");
    expect(formatDuration(600)).toBe("1s");
  });

  test("clamps a negative lag rather than printing a sign", () => {
    expect(formatDuration(-5000)).toBe("0s");
  });

  test("a non-number is not a duration", () => {
    expect(formatDuration(Number.NaN)).toBe("0s");
  });
});

describe("formatSeconds — sub-10s precision", () => {
  test("keeps one decimal below ten seconds", () => {
    expect(formatSeconds(9.4)).toBe("9.4s");
    expect(formatSeconds(9.8)).toBe("9.8s"); // the canonical rule prints both as 9s
    expect(formatSeconds(0)).toBe("0.0s");
  });

  test("drops the fraction from ten seconds up", () => {
    expect(formatSeconds(10)).toBe("10s");
    expect(formatSeconds(42.4)).toBe("42s");
    expect(formatSeconds(42.6)).toBe("43s");
  });
});

describe("since — relative, single-unit", () => {
  const now = new Date("2026-08-13T12:00:00Z");
  const ago = (seconds: number) =>
    since(new Date(now.getTime() - seconds * 1000), now);

  test.each([
    [0, "just now"],
    [89, "just now"],
    [90, "2m ago"], // rounded, not truncated: this answers "is it current?"
    [3599, "60m ago"],
    [3600, "1h ago"],
    [20_820, "6h ago"],
    [86_399, "24h ago"],
    [86_400, "1d ago"],
    [259_200, "3d ago"],
  ])("%p seconds ago is %p", (seconds, expected) => {
    expect(ago(seconds)).toBe(expected);
  });

  test("a stamp from the future is not negative time", () => {
    expect(ago(-3600)).toBe("just now");
  });

  test("is relative to the view's own stamp, not the wall clock", () => {
    const stamp = new Date("2019-03-12T03:50:00Z");
    const rendered = new Date("2019-03-12T09:50:00Z");
    expect(since(stamp, rendered)).toBe("6h ago");
  });
});
