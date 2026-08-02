import { describe, expect, test } from "bun:test";
import { app } from "./app";
import { config } from "./config";

describe("@daneroo/qcic-status", () => {
  test("GET / returns the version object", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(config.version);
  });

  test("GET /api/version returns stamp, hostname, version, type", async () => {
    const res = await app.request("/api/version");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stamp: string;
      hostname: string;
      version: typeof config.version;
      type: string;
    };
    expect(body).toMatchObject({
      hostname: config.hostname,
      version: config.version,
      type: "version",
    });
    expect(() => new Date(body.stamp).toISOString()).not.toThrow();
  });
});
