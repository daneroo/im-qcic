import { asTable, iso8601ify, queries, type Table } from "./tedcheck";
import type { TedcheckDataSource } from "./tedcheck-datasource";

export interface TedcheckPayload {
  meta: {
    stamp: string;
    hostname: string;
    version: { name: string; version: string; runtime: string };
    type: "tedcheck";
  };
  data: Record<string, Table>;
}

export interface PollDeps {
  datasource: TedcheckDataSource;
  publish(payload: TedcheckPayload): Promise<void>;
  hostname: string;
  version: TedcheckPayload["meta"]["version"];
  // Injectable for tests - defaults to the real clock.
  now?: () => Date;
}

// One poll cycle: query MySQL for all three Tedcheck views, build the same
// {meta,data} shape v2/apps/status's /api/tedcheck already returns, and
// publish it. Pure aside from the injected datasource/publish/clock, so
// it's testable without real MySQL or NATS.
export async function pollOnce(deps: PollDeps): Promise<TedcheckPayload> {
  const data: Record<string, Table> = {};
  for (const [name, sql] of Object.entries(queries)) {
    const rows = await deps.datasource.query(sql);
    data[name] = iso8601ify(asTable(rows));
  }

  const payload: TedcheckPayload = {
    meta: {
      stamp: (deps.now?.() ?? new Date()).toISOString(),
      hostname: deps.hostname,
      version: deps.version,
      type: "tedcheck",
    },
    data,
  };

  await deps.publish(payload);
  return payload;
}
