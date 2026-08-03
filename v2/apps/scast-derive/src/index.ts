import { config } from "./config";
import { createKvPublish, type Publish } from "./kv-publish";
import { log } from "./logger";
import { run } from "./run";
import { createNatsDataSource } from "./scrobblecast-datasource";

const dataSource = createNatsDataSource(config.natsProd);
const publish = createKvPublish(config.nats);

const loggingPublish: Publish = Object.assign(
  async (payload: unknown) => {
    await publish(payload);
    log.info("published");
  },
  { close: publish.close },
);

log.info({ windowMs: config.windowMs }, "starting");

run({
  records: dataSource.subscribe(config.windowMs),
  publish: loggingPublish,
  windowMs: config.windowMs,
  hostname: config.hostname,
  version: config.version,
}).catch((err: Error) => {
  log.error({ err: err.message }, "run failed");
  process.exitCode = 1;
});

// Guarded against re-entry: a signal can be delivered more than once (e.g.
// a double Ctrl-C, or both SIGINT and SIGTERM arriving), and calling
// nc.drain() a second time on an already-draining connection throws.
// Draining dataSource's connection also ends its subscription's iterator,
// which is what lets run()'s otherwise-indefinite loop return.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    await Promise.all([dataSource.close(), publish.close()]);
    process.exit(0);
  });
}
