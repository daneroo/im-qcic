import { asTable } from "./logcheck";
import type { ScrobblecastDataSource } from "./scrobblecast-datasource";
import type { Publish } from "./kv-publish";

export interface PollCycleDeps {
  dataSource: Pick<ScrobblecastDataSource, "fetchRecent">;
  publish: Publish;
  windowMs: number;
  hostname: string;
  version: { name: string; version: string; runtime: string };
}

// The one seam this service is tested through: given a datasource and a
// publish function (both injectable), fetch the recent window, derive the
// digest table, and publish it - matching today's /api/logcheck {meta,data}
// shape exactly.
export async function runCycle(deps: PollCycleDeps): Promise<void> {
  const records = await deps.dataSource.fetchRecent(deps.windowMs);
  const data = asTable(records);
  const payload = {
    meta: {
      stamp: new Date().toISOString(),
      hostname: deps.hostname,
      version: deps.version,
      type: "logcheck",
    },
    data,
  };
  await deps.publish(payload);
}
