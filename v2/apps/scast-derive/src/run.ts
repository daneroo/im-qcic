import { asTable, type CheckpointRecord } from "./digest";
import type { Publish } from "./kv-publish";

export interface RunDeps {
  // an already-subscribed, live-tailing source of records - see
  // scrobblecast-datasource.ts's subscribe()
  records: AsyncIterable<CheckpointRecord>;
  publish: Publish;
  // how far back a record is still considered part of the current view -
  // older buffered records are pruned before each publish
  windowMs: number;
  hostname: string;
  version: { name: string; version: string; runtime: string };
  // injectable for testing pruning-over-time without a real clock;
  // defaults to the real wall clock
  now?: () => Date;
}

// Reactive, not polling: consumes records as they arrive (starting with
// the historical backlog `records` already replays, then live), keeps a
// pruned rolling buffer, and republishes the derived digest table on every
// new record - not on a fixed timer. Runs until `records` ends (i.e. the
// underlying subscription is closed/drained).
export async function run(deps: RunDeps): Promise<void> {
  const now = deps.now ?? (() => new Date());
  const buffer: CheckpointRecord[] = [];

  for await (const record of deps.records) {
    buffer.push(record);
    pruneStale(buffer, deps.windowMs, now());

    const data = asTable(buffer);
    await deps.publish({
      meta: {
        stamp: now().toISOString(),
        hostname: deps.hostname,
        version: deps.version,
        type: "digest",
      },
      data,
    });
  }
}

function pruneStale(
  buffer: CheckpointRecord[],
  windowMs: number,
  now: Date,
): void {
  const cutoff = now.getTime() - windowMs;
  let i = 0;
  while (i < buffer.length) {
    if (new Date(buffer[i]!.stamp).getTime() < cutoff) {
      buffer.splice(i, 1);
    } else {
      i++;
    }
  }
}
