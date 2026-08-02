import { Hono } from "hono";
import { config } from "./config";
import { requestLogger } from "./logger";
import { asTable, iso8601ify, queries, type Table } from "./tedcheck";
import {
  createMysqlDataSource,
  type TedcheckDataSource,
} from "./tedcheck-datasource";

export interface AppDeps {
  tedcheck?: TedcheckDataSource;
}

export function createApp(deps: AppDeps = {}): Hono {
  const tedcheckSource = deps.tedcheck ?? createMysqlDataSource(config.mysql);

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

  return app;
}

export const app = createApp();
