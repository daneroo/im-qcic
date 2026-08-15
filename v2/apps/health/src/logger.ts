import pino from "pino";
import type { MiddlewareHandler } from "hono";

export const log = pino();

export const requestLogger: MiddlewareHandler = async (context, next) => {
  await next();
  log.info(
    {
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
    },
    "request",
  );
};
