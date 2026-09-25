import { describe, expect, test } from "bun:test";
import { durableName } from "./config";

describe("durableName", () => {
  test("is scoped to the host, so instances never share a durable", () => {
    expect(durableName({ HOSTALIAS: "qcic-syno" })).toBe(
      "scast-bridge-qcic-syno",
    );
  });

  test("requires HOSTALIAS rather than falling back to the hostname", () => {
    expect(() => durableName({})).toThrow("HOSTALIAS");
    expect(() => durableName({ HOSTALIAS: "" })).toThrow("HOSTALIAS");
  });
});
