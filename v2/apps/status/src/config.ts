import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };
import type { LogglyCredentials } from "./logcheck-datasource";
import { log } from "./logger";
import type { MysqlCredentials } from "./tedcheck-datasource";

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    runtime: string;
  };
  port: number;
  loggly: LogglyCredentials | null;
  mysql: MysqlCredentials | null;
}

export const config: Config = {
  hostname: process.env.HOSTALIAS || osHostname(),
  version: {
    // also exposed as API /version
    name: pkg.name,
    version: pkg.version,
    runtime: `bun:${Bun.version}`,
  },
  // 8000 is the standard default across all v2/apps/* (see ADR-0003) -
  // override with PORT, or remap at the Docker/Compose level.
  port: Number(process.env.PORT) || 8000,
  // Workspace-wide gitignored infra/credentials/ (see v2/.gitignore,
  // matching infra/gateway's own credentials/ convention) - ../../ from
  // this app's WORKDIR reaches the v2/ workspace root in both local dev
  // and Docker (see the Dockerfile's mount-path comment for the container
  // side).
  loggly: getCredential<LogglyCredentials>(
    "../../infra/credentials/credentials.loggly.json",
  ),
  mysql: getCredential<MysqlCredentials>(
    "../../infra/credentials/credentials.mysql.json",
  ),
};

// used for loggly/mysql credentials - gracefully returns null if the
// gitignored file isn't present (e.g. local dev, or not yet mounted)
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
