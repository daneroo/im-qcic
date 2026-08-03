import { config } from "./config";
import { createKvPublish } from "./kv-publish";
import { log } from "./logger";
import { runCycle } from "./poll-cycle";
import { createNatsDataSource } from "./scrobblecast-datasource";

const dataSource = createNatsDataSource(config.natsProd);
const publish = createKvPublish(config.nats);

async function tick(): Promise<void> {
  try {
    await runCycle({
      dataSource,
      publish,
      windowMs: config.windowMs,
      hostname: config.hostname,
      version: config.version,
    });
    log.info({ windowMs: config.windowMs }, "cycle published");
  } catch (err) {
    log.error({ err: (err as Error).message }, "cycle failed");
  }
}

log.info({ pollIntervalMs: config.pollIntervalMs }, "starting");
tick();
const interval = setInterval(tick, config.pollIntervalMs);

// Guarded against re-entry: a signal can be delivered more than once (e.g.
// a double Ctrl-C, or both SIGINT and SIGTERM arriving), and calling
// nc.drain() a second time on an already-draining connection throws.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    clearInterval(interval);
    await Promise.all([dataSource.close(), publish.close()]);
    process.exit(0);
  });
}
