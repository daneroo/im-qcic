import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };
import { log } from "./logger";
import type { ScrobblecastCredentials } from "./scrobblecast-datasource";

export interface NatsCredentials {
  servers: string;
}

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    runtime: string;
  };
  // how much history to replay from the production stream each cycle
  windowMs: number;
  // how often to poll/publish
  pollIntervalMs: number;
  // "prod" names infra/gateway's actual production NATS server - a durable
  // name regardless of what happens to it. `nats` (not "new"/"v2") is the
  // one this workspace publishes into and web reads from - "new" only made
  // sense relative to "prod" and would go stale once prod is ever retired
  // or upgraded.
  natsProd: ScrobblecastCredentials | null;
  nats: NatsCredentials | null;
}

export const config: Config = {
  hostname: process.env.HOSTALIAS || osHostname(),
  version: {
    name: pkg.name,
    version: pkg.version,
    runtime: `bun:${Bun.version}`,
  },
  windowMs: Number(process.env.WINDOW_MS) || 24 * 60 * 60 * 1000, // 24h, matching Phase 1's Loggly search window
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 60_000, // matching Phase 1's polling cadence
  // Workspace-wide gitignored infra/credentials/ (see v2/AGENTS.md) - ../../
  // from this app's WORKDIR reaches the v2/ workspace root.
  natsProd: getCredential<ScrobblecastCredentials>(
    "../../infra/credentials/credentials.nats-prod.json",
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
