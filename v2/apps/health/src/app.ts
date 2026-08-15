import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HealthObserver } from "./health";
import { log, requestLogger } from "./logger";

export function createApp(health: HealthObserver): Hono {
  const app = new Hono();

  app.use("*", requestLogger);
  app.onError((error, context) => {
    log.error(
      { path: context.req.path, error: error.message },
      "request error",
    );
    return context.json({ error: "Internal Server Error" }, 500);
  });

  app.use("/healthz", cors({ origin: "*", allowMethods: ["GET"] }));
  app.get("/healthz", async (context) => {
    const reading = await health.read();
    const available = reading.tailnet.available && reading.nats.available;
    context.header("Cache-Control", "no-store");
    return context.json(reading, available ? 200 : 503);
  });

  return app;
}
