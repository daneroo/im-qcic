import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };
import { log } from "./logger";
import type { MysqlCredentials } from "./tedcheck-datasource";

export interface NatsCredentials {
  servers: string;
}

// This service's identity on the new NATS server's KV bucket - matches
// v2/apps/status's own {meta,data} shape for /api/tedcheck, so downstream
// consumers (web) don't need to learn a new shape.
export const KV_BUCKET_NAME = "ted1k-derive";
export const KV_KEY = "tedcheck";

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    runtime: string;
  };
  // Matches Phase 1's HTTP-polled cadence (packages/status/CONTEXT.md) - an
  // internal timer now stands in for site's own request/response cycle.
  pollIntervalMs: number;
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
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 60_000,
  // Workspace-wide gitignored infra/credentials/ (see v2/AGENTS.md) - ../../
  // from this app's WORKDIR reaches the v2/ workspace root.
  mysql: getCredential<MysqlCredentials>(
    "../../infra/credentials/credentials.mysql.json",
  ),
  nats: getCredential<NatsCredentials>(
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
