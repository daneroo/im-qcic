import {
  config,
  KV_BUCKET_NAME,
  pollIntervalMs,
  type ViewName,
} from "./config";
import { createMysqlDataSource } from "./ted1k-datasource";
import { createKvSink } from "./kv-sink";
import { pollView } from "./poll";
import { queries } from "./ted1k";
import { log } from "./logger";

const datasource = createMysqlDataSource(config.mysql);
const sink = createKvSink(config.nats);
const views = Object.keys(queries) as ViewName[];

log.info({ bucket: KV_BUCKET_NAME, views, pollIntervalMs }, "starting");

async function cycle(view: ViewName): Promise<void> {
  try {
    await pollView(view, {
      datasource,
      publish: sink.publish,
      hostname: config.hostname,
      version: config.version,
    });
    log.info({ view }, "published");
  } catch (err) {
    log.error({ view, err: (err as Error).message }, "poll cycle failed");
  }
}

// Three independent timers means a cycle can be in flight on any of them
// when a shutdown signal arrives - tracked here so shutdown can await
// whatever's running before draining the sink's connection out from under
// it, rather than racing a kv.put() against nc.drain().
const inFlight = new Set<Promise<void>>();
function scheduleCycle(view: ViewName): Promise<void> {
  const p = cycle(view).finally(() => inFlight.delete(p));
  inFlight.add(p);
  return p;
}

await Promise.all(views.map(scheduleCycle));
const timers = views.map((view) =>
  setInterval(() => scheduleCycle(view), pollIntervalMs[view]),
);

// Guarded against re-entry - see v2/apps/scast-bridge/src/index.ts for why
// (a signal can be delivered more than once).
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    for (const timer of timers) clearInterval(timer);
    await Promise.all(inFlight);
    await sink.close();
    process.exit(0);
  });
}
