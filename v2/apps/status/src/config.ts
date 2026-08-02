import { readFileSync } from "node:fs";
import { hostname as osHostname } from "node:os";
import pkg from "../package.json" with { type: "json" };

export interface Config {
  hostname: string;
  version: {
    name: string;
    version: string;
    node: string;
  };
  port: number;
  loggly: unknown;
  mysql: unknown;
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
  // Not consumed yet in this ticket - carried over for Tedcheck (#225,
  // mysql) and Logcheck (#226, loggly) to build on.
  loggly: getCredential("credentials.loggly.json"),
  mysql: getCredential("credentials.mysql.json"),
};

// used for loggly/mysql credentials - gracefully returns null if the
// gitignored file isn't present (e.g. local dev, or not yet mounted)
function getCredential(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path).toString());
  } catch (err) {
    console.warn("getCredential", path, (err as Error).message);
    return null;
  }
}
