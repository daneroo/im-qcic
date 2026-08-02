import { Hono } from "hono";
import { config } from "./config";
import { requestLogger } from "./logger";

export const app = new Hono();

app.use("*", requestLogger);

app.get("/", (c) => c.json(config.version));

app.get("/api/version", (c) => {
  return c.json({
    stamp: new Date().toISOString(),
    hostname: config.hostname,
    version: config.version,
    type: "version",
  });
});
