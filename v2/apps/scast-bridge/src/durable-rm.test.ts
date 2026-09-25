import { describe, expect, test } from "bun:test";
import { refusal } from "./durable-rm";

const unbound = { push_bound: false };

describe("refusal", () => {
  test("allows a stale, unbound scast-bridge durable", () => {
    expect(refusal("scast-bridge", unbound, "scast-bridge-qcic-syno")).toBe(
      null,
    );
  });

  test("refuses a durable that is still bound to a subscriber", () => {
    expect(
      refusal("scast-bridge", { push_bound: true }, "scast-bridge-qcic-syno"),
    ).toContain("bound");
  });

  test("refuses this host's own durable", () => {
    expect(
      refusal("scast-bridge-qcic-syno", unbound, "scast-bridge-qcic-syno"),
    ).toContain("this host");
  });

  test("refuses anything that is not a scast-bridge durable", () => {
    expect(
      refusal("scrobblecast-archiver", unbound, "scast-bridge-qcic-syno"),
    ).toContain("not a scast-bridge durable");
  });
});
