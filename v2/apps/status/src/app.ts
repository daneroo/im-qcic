import { Hono } from "hono";
import { config } from "./config";
import { requestLogger } from "./logger";
import { asTable as asDigestTable, searchOptions } from "./logcheck";
import {
  createLogglyDataSource,
  type LogglyDataSource,
} from "./logcheck-datasource";
import { asTable, iso8601ify, queries, type Table } from "./tedcheck";
import {
  createMysqlDataSource,
  type TedcheckDataSource,
} from "./tedcheck-datasource";

export interface AppDeps {
  tedcheck?: TedcheckDataSource;
  logcheck?: LogglyDataSource;
}

export function createApp(deps: AppDeps = {}): Hono {
  const tedcheckSource = deps.tedcheck ?? createMysqlDataSource(config.mysql);
  const logglySource = deps.logcheck ?? createLogglyDataSource(config.loggly);

  const app = new Hono();

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

  app.get("/api/tedcheck", async (c) => {
    const data: Record<string, Table> = {};
    for (const [name, sql] of Object.entries(queries)) {
      const rows = await tedcheckSource.query(sql);
      data[name] = iso8601ify(asTable(rows));
    }
    return c.json({
      meta: {
        stamp: new Date().toISOString(),
        hostname: config.hostname,
        version: config.version,
        type: "tedcheck",
      },
      data,
    });
  });

  app.get("/api/logcheck", async (c) => {
    const events = await logglySource.search(searchOptions);
    const data = asDigestTable(events);
    return c.json({
      meta: {
        stamp: new Date().toISOString(),
        hostname: config.hostname,
        version: config.version,
        type: "logcheck",
      },
      data,
    });
  });

  return app;
}

export const app = createApp();
