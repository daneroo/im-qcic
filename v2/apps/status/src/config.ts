import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };
import type { MysqlCredentials } from "./tedcheck-datasource";

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    node: string;
  };
  port: number;
  // Not consumed yet - carried over for Logcheck (#226) to build on.
  loggly: unknown;
  mysql: MysqlCredentials | null;
}

export const config: Config = {
  hostname: process.env.HOSTALIAS || osHostname(),
  version: {
    // also exposed as API /version
    name: pkg.name,
    version: pkg.version,
    node: process.version,
  },
  port: Number(process.env.PORT) || 8001,
  loggly: getCredential("credentials.loggly.json"),
  mysql: getCredential<MysqlCredentials>("credentials.mysql.json"),
};

// used for loggly/mysql credentials - gracefully returns null if the
// gitignored file isn't present (e.g. local dev, or not yet mounted)
function getCredential<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path).toString()) as T;
  } catch (err) {
    console.warn("getCredential", path, (err as Error).message);
    return null;
  }
}
