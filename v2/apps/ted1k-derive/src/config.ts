import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };
import { log } from "./logger";
import { queries } from "./ted1k";
import type { MysqlCredentials } from "./ted1k-datasource";

export interface NatsCredentials {
  servers: string;
}

export type ViewName = keyof typeof queries;

// This service's identity on the new NATS server's KV bucket - one key per
// view, matching the query names in ted1k.ts's `queries` map 1:1, so
// consumers can watch/fetch a section independently of the others.
export const KV_BUCKET_NAME = "im-ted1k-derive";

// Each view gets its own poll cadence, not one shared timer: missingLastDay
// recomputes a rolling 24h window every call and is the most volatile;
// missingDayByHour (24h grouped by hour) changes moderately; missingWeekByDay
// (32-day window grouped by day) is mostly stable - only today's row is
// still growing. Overridable per-view via env, same pattern as before.
export const pollIntervalMs: Record<ViewName, number> = {
  missingLastDay:
    Number(process.env.POLL_INTERVAL_MISSING_LAST_DAY_MS) || 60_000,
  missingDayByHour:
    Number(process.env.POLL_INTERVAL_MISSING_DAY_BY_HOUR_MS) || 5 * 60_000,
  missingWeekByDay:
    Number(process.env.POLL_INTERVAL_MISSING_WEEK_BY_DAY_MS) || 10 * 60_000,
};

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    runtime: string;
  };
  mysql: MysqlCredentials | null;
  nats: NatsCredentials | null;
}

export const config: Config = {
  hostname: process.env.HOSTALIAS || osHostname(),
  version: {
    name: pkg.name,
    version: pkg.version,
    runtime: `bun:${Bun.version}`,
  },
  // Workspace-wide gitignored infra/credentials/ (see v2/AGENTS.md) - ../../
  // from this app's WORKDIR reaches the v2/ workspace root.
  mysql: getCredential<MysqlCredentials>(
    "../../infra/credentials/credentials.mysql.json",
  ),
  // credentials.nats.json's "localhost:4222" is only correct for bare-metal
  // dev - inside the compose network, "localhost" is the container itself,
  // not the nats service, so NATS_SERVERS (set to "nats:4222" in
  // v2/infra/compose.yaml) overrides it there. Same override pattern as
  // HOSTALIAS/POLL_INTERVAL_* above.
  nats: process.env.NATS_SERVERS
    ? { servers: process.env.NATS_SERVERS }
    : getCredential<NatsCredentials>(
        "../../infra/credentials/credentials.nats.json",
      ),
};

function getCredential<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path).toString()) as T;
  } catch (err) {
    log.warn(
      { path, err: (err as Error).message },
      "credential file not found",
    );
    return null;
  }
}
