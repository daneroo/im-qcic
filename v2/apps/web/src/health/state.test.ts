import { describe, expect, test } from "bun:test";
import { deriveHealthReading } from "./state";

describe("deriveHealthReading", () => {
  test("becomes live only with current coarse availability and a connected detail value", () => {
    expect(
      deriveHealthReading({
        coarse: { available: true },
        coarseCurrent: true,
        transportStatus: "connected",
        value: { observedAt: "now" },
      }),
    ).toMatchObject({ status: "live", value: { observedAt: "now" } });
  });

  test("retains detail but makes it unavailable when either observation path fails", () => {
    const value = { observedAt: "before" };
    expect(
      deriveHealthReading({
        coarse: { available: false },
        coarseCurrent: true,
        transportStatus: "connected",
        value,
      }),
    ).toMatchObject({ status: "unavailable", value });
    expect(
      deriveHealthReading({
        coarse: { available: true },
        coarseCurrent: true,
        transportStatus: "reconnecting",
        value,
      }),
    ).toMatchObject({ status: "unavailable", value });
  });

  test("distinguishes initial loading from unavailable sources", () => {
    expect(
      deriveHealthReading({
        coarse: null,
        coarseCurrent: false,
        transportStatus: "connecting",
        value: null,
      }).status,
    ).toBe("loading");
    expect(
      deriveHealthReading({
        coarse: null,
        coarseCurrent: false,
        transportStatus: "closed",
        value: null,
      }).status,
    ).toBe("unavailable");
  });
});
