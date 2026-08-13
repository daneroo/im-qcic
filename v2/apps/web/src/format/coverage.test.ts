import { describe, expect, test } from "bun:test";
import { formatCoverage } from "./coverage";

const HOUR = 3600;
const DAY = 86_400;
const MONTH = 31 * DAY;

describe("formatCoverage — precision from leading nines", () => {
  test.each([
    // missing/expected, leading nines -> decimals
    [17 * HOUR, DAY, "29%"], //  0 -> 0
    [2 * HOUR, DAY, "91%"], //   1 -> 0
    [15 * 60, DAY, "98%"], //    1 -> 0
    [6 * 60, DAY, "99%"], //     2 -> 0  (from 99.58%)
    [30, DAY, "99.9%"], //       3 -> 1  (from 99.965%)
    [3, DAY, "99.99%"], //       4 -> 2  (from 99.9965%)
  ])("%p missing of %p is %p", (missing, expected, text) => {
    expect(formatCoverage(missing, expected)).toBe(text);
  });
});

describe("formatCoverage — truncate, never round", () => {
  test("a month at 99.8611% is 99%, not 100%", () => {
    // An hour gone out of thirty days. Two leading nines, so zero decimals -
    // and rounding would call a month with an outage in it perfect.
    const missing = HOUR;
    const month = 30 * DAY;
    expect(((month - missing) / month) * 100).toBeCloseTo(99.8611, 4);
    expect(formatCoverage(missing, month)).toBe("99%");
  });

  test("truncates at every width the rule uses", () => {
    expect(formatCoverage(19, 100)).toBe("81%"); // 81% exactly
    expect(formatCoverage(1889, 10_000)).toBe("81%"); // 81.11% down to 81%
    expect(formatCoverage(79, 100_000)).toBe("99.9%"); // 99.921% down to 99.9%
    expect(formatCoverage(70, 1_000_000)).toBe("99.99%"); // 99.993% -> 99.99%
  });

  test("never claims a nine the data has not earned", () => {
    // One sample past the boundary drops the whole width: 99.899% has two
    // leading nines, so it gets no decimals at all and reads 99%.
    expect(formatCoverage(1000, 100_000)).toBe("99%"); // 99.0%
    expect(formatCoverage(1001, 100_000)).toBe("98%"); // 98.999%
    expect(formatCoverage(100, 100_000)).toBe("99.9%");
    expect(formatCoverage(101, 100_000)).toBe("99%"); // 99.899%
  });

  test("a percentage that lands an epsilon under its digit still reads true", () => {
    // (3600-1512)/3600*100 is 57.999999999999993 in a double; flooring the
    // scaled value would print 57%.
    expect(((HOUR - 1512) / HOUR) * 100).not.toBe(58);
    expect(formatCoverage(1512, HOUR)).toBe("58%");
  });
});

describe("formatCoverage — 100% is reserved", () => {
  test("nothing missing is the only way to print it", () => {
    expect(formatCoverage(0, DAY)).toBe("100%");
    expect(formatCoverage(-0, DAY)).toBe("100%");
  });

  test("any loss at all prints under 100, however small", () => {
    for (const expected of [DAY, MONTH, 1e6, 1e9, 1e12]) {
      expect(formatCoverage(1, expected)).not.toBe("100%");
      expect(formatCoverage(1, expected).startsWith("99.9")).toBe(true);
    }
  });
});

describe("formatCoverage — edges", () => {
  test("below ten percent keeps a decimal rather than a lone digit", () => {
    expect(formatCoverage(912, 1000)).toBe("8.8%");
    expect(formatCoverage(989, 1000)).toBe("1.1%");
    expect(formatCoverage(DAY, DAY)).toBe("0.0%");
  });

  test("more missing than the window can hold is still nothing left", () => {
    expect(formatCoverage(2 * DAY, DAY)).toBe("0.0%");
  });

  test("an unusable window has no coverage to report", () => {
    expect(formatCoverage(60, 0)).toBe("—");
    expect(formatCoverage(60, -1)).toBe("—");
    expect(formatCoverage(60, Number.NaN)).toBe("—");
    expect(formatCoverage(Number.NaN, DAY)).toBe("—");
  });
});
