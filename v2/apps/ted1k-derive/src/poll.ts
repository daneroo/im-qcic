import { asTable, iso8601ify, queries, type Table } from "./ted1k";
import type { Ted1kDataSource } from "./ted1k-datasource";
import type { ViewName } from "./config";

export interface ViewPayload {
  meta: {
    stamp: string;
    hostname: string;
    version: { name: string; version: string; runtime: string };
    type: "ted1k";
    view: ViewName;
  };
  data: Table;
}

export interface PollDeps {
  datasource: Ted1kDataSource;
  publish(view: ViewName, payload: ViewPayload): Promise<void>;
  hostname: string;
  version: ViewPayload["meta"]["version"];
  // Injectable for tests - defaults to the real clock.
  now?: () => Date;
}

// One poll cycle for a single view: query MySQL for just that view's query,
// build a self-contained {meta,data} payload (each view carries its own
// stamp, since views now refresh on independent cadences), and publish it
// under its own KV key. Pure aside from the injected datasource/publish/
// clock, so it's testable without real MySQL or NATS.
export async function pollView(
  view: ViewName,
  deps: PollDeps,
): Promise<ViewPayload> {
  const rows = await deps.datasource.query(queries[view]);

  const payload: ViewPayload = {
    meta: {
      stamp: (deps.now?.() ?? new Date()).toISOString(),
      hostname: deps.hostname,
      version: deps.version,
      type: "ted1k",
      view,
    },
    data: iso8601ify(asTable(rows)),
  };

  await deps.publish(view, payload);
  return payload;
}
