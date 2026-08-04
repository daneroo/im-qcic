import { readFileSync } from "node:fs";
import { log } from "./logger";

export interface ScrobblecastCredentials {
  servers: string;
}

export interface NatsCredentials {
  servers: string;
}

// The real, fixed upstream facts - not env-configurable, since they name
// things this bridge doesn't own.
export const SOURCE_STREAM_NAME = "scrobblecastDigest";
export const SOURCE_SUBJECT = "im.scrobblecast.scrape.digest";

// This bridge's own identity on both servers.
export const DURABLE_NAME = "scast-bridge";
export const DEST_STREAM_NAME = "scastDigest";
export const DEST_SUBJECT_PREFIX = "im.scast.scrape.digest";

// Renames the "scrobblecast" segment to "scast" - we're in a new namespace,
// not scrobblecast's own. A plain string replace is safe here: SOURCE_SUBJECT
// only ever appears once, as the prefix.
export function rewriteSubject(subject: string): string {
  return subject.replace(SOURCE_SUBJECT, DEST_SUBJECT_PREFIX);
}

export interface Config {
  // Only used the first time this bridge's durable consumer is ever
  // created, to backfill history - after that, the durable consumer's own
  // saved position governs delivery on restart, not this value.
  initialWindowMs: number;
  // "prod" names infra/gateway's actual production NATS server - a durable
  // name regardless of what happens to it. `nats` (not "new"/"v2") is the
  // one this workspace publishes into and web reads from - "new" only made
  // sense relative to "prod" and would go stale once prod is ever retired
  // or upgraded.
  natsProd: ScrobblecastCredentials | null;
  nats: NatsCredentials | null;
}

export const config: Config = {
  initialWindowMs: Number(process.env.INITIAL_WINDOW_MS) || 24 * 60 * 60 * 1000,
  // Workspace-wide gitignored infra/credentials/ (see v2/AGENTS.md) - ../../
  // from this app's WORKDIR reaches the v2/ workspace root.
  natsProd: getCredential<ScrobblecastCredentials>(
    "../../infra/credentials/credentials.nats-prod.json",
  ),
  // credentials.nats.json's "localhost:4222" is only correct for bare-metal
  // dev - inside the compose network, "localhost" is the container itself,
  // not the nats service, so NATS_SERVERS (set to "nats:4222" in
  // v2/infra/compose.yaml) overrides it there. natsProd needs no such
  // override - it already names a real external host, unaffected by which
  // network this container runs in.
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
