import { config, KV_BUCKET_NAME, KV_KEY } from "./config";
import { createMysqlDataSource } from "./tedcheck-datasource";
import { createKvSink } from "./kv-sink";
import { pollOnce } from "./poll";
import { log } from "./logger";

const datasource = createMysqlDataSource(config.mysql);
const sink = createKvSink(config.nats);

log.info(
  { bucket: KV_BUCKET_NAME, key: KV_KEY, intervalMs: config.pollIntervalMs },
  "starting",
);

async function cycle(): Promise<void> {
  try {
    await pollOnce({
      datasource,
      publish: sink.publish,
      hostname: config.hostname,
      version: config.version,
    });
    log.info("published");
  } catch (err) {
    log.error({ err: (err as Error).message }, "poll cycle failed");
  }
}

await cycle();
const timer = setInterval(cycle, config.pollIntervalMs);

// Guarded against re-entry - see v2/apps/scast-bridge/src/index.ts for why
// (a signal can be delivered more than once).
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    clearInterval(timer);
    await sink.close();
    process.exit(0);
  });
}
