import { describe, expect, test } from "bun:test";
import { resolveEndpoints } from "./endpoints";

describe("resolveEndpoints", () => {
  test("an https page gets wss NATS and healthz on its own origin", () => {
    expect(
      resolveEndpoints(
        { protocol: "https:", host: "qcic.ts.imetrical.net" },
        {},
      ),
    ).toEqual({
      natsWsUrl: "wss://qcic.ts.imetrical.net/nats",
      healthHttpUrl: "https://qcic.ts.imetrical.net/healthz",
    });
  });

  test("an http page gets ws NATS, and the port is kept", () => {
    expect(
      resolveEndpoints({ protocol: "http:", host: "localhost:8080" }, {}),
    ).toEqual({
      natsWsUrl: "ws://localhost:8080/nats",
      healthHttpUrl: "http://localhost:8080/healthz",
    });
  });

  test("overrides win over the page location", () => {
    expect(
      resolveEndpoints(
        { protocol: "https:", host: "qcic.imetrical.net" },
        {
          natsWsUrl: "ws://localhost:9222",
          healthHttpUrl: "http://localhost:8000/healthz",
        },
      ),
    ).toEqual({
      natsWsUrl: "ws://localhost:9222",
      healthHttpUrl: "http://localhost:8000/healthz",
    });
  });

  test("an empty override is no override", () => {
    expect(
      resolveEndpoints(
        { protocol: "https:", host: "qcic.imetrical.net" },
        { natsWsUrl: "", healthHttpUrl: "" },
      ).natsWsUrl,
    ).toBe("wss://qcic.imetrical.net/nats");
  });

  test("no location (server render) and no override gives empty URLs", () => {
    expect(resolveEndpoints(undefined, {})).toEqual({
      natsWsUrl: "",
      healthHttpUrl: "",
    });
  });
});
