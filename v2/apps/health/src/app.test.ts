import { describe, expect, test } from "bun:test";
import { createApp } from "./app";
import type { HealthObserver } from "./health";
import type { PublicHealth } from "./types";

const HEALTHY: PublicHealth = {
  schema: 1,
  observer: "syno",
  tailnet: { available: true, observedAt: "2026-08-15T14:02:29.000Z" },
  nats: { available: true, observedAt: "2026-08-15T14:02:31.000Z" },
};

function observer(reading: PublicHealth): HealthObserver {
  return {
    read: async () => reading,
    latestNats: () => null,
    latestTailnet: () => null,
  };
}

describe("health HTTP app", () => {
  test("GET /healthz exposes the exact public reading with bootstrap headers", async () => {
    const response = await createApp(observer(HEALTHY)).request("/healthz", {
      headers: { Origin: "https://qcic.imetrical.com" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual(HEALTHY);
  });

  test("GET /healthz returns 503 for every combination that is not all available", async () => {
    const combinations = [
      { tailnet: false, nats: true },
      { tailnet: true, nats: false },
      { tailnet: false, nats: false },
    ];

    for (const combination of combinations) {
      const reading: PublicHealth = {
        ...HEALTHY,
        tailnet: { ...HEALTHY.tailnet, available: combination.tailnet },
        nats: { ...HEALTHY.nats, available: combination.nats },
      };
      const response = await createApp(observer(reading)).request("/healthz");
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual(reading);
    }
  });
});
