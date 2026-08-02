import pino from "pino";
import type { MiddlewareHandler } from "hono";

// Single instantiated pino logger for re-use - JSON to stdout by default,
// matching the current packages/status output (captured verbatim by
// Gateway's docker-compose json-file logging driver).
export const log = pino();

export const requestLogger: MiddlewareHandler = async (c, next) => {
  await next();
  log.info(
    { method: c.req.method, path: c.req.path, status: c.res.status },
    "request",
  );
};
