import {
  config,
  KV_BUCKET_NAME,
  pollIntervalMs,
  type ViewName,
} from "./config";
import { createMysqlDataSource } from "./tedcheck-datasource";
import { createKvSink } from "./kv-sink";
import { pollView } from "./poll";
import { queries } from "./tedcheck";
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

await Promise.all(views.map(cycle));
const timers = views.map((view) =>
  setInterval(() => cycle(view), pollIntervalMs[view]),
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
    await sink.close();
    process.exit(0);
  });
}
