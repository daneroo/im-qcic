import { JSONCodec } from "nats";
import {
  config,
  DEST_STREAM_NAME,
  durableName,
  SOURCE_STREAM_NAME,
  rewriteSubject,
} from "./config";
import { createScastSink } from "./scast-sink";
import { createScrobblecastSource } from "./scrobblecast-source";
import { run, type BridgeMessage } from "./bridge";
import { log } from "./logger";

let durable: string;
try {
  durable = durableName(process.env);
} catch (err) {
  log.fatal({ err: (err as Error).message }, "invalid configuration");
  process.exit(1);
}
const source = createScrobblecastSource(config.natsProd, durable);

log.info({ windowMs: config.initialWindowMs, durable }, "starting");

const sourceStreamConfig = await source.fetchSourceStreamConfig();
log.info(
  { source: SOURCE_STREAM_NAME, ...sourceStreamConfig, dest: DEST_STREAM_NAME },
  "mirroring source stream config onto destination",
);

const sink = createScastSink(config.nats, sourceStreamConfig);

// Decoded here for a human-readable log line only - the copy path never
// decodes; this is a read-only side effect, best-effort.
const jc = JSONCodec<{ host?: string; generation?: string; digest?: string }>();
function describeForLog(m: BridgeMessage): Record<string, unknown> {
  try {
    const { host, generation, digest } = jc.decode(m.data);
    return { host, generation, digest: digest?.slice(0, 7) };
  } catch {
    return {};
  }
}

let shuttingDown = false;
run({
  messages: source.subscribe(config.initialWindowMs),
  sink,
  rewriteSubject,
  msgIdPrefix: SOURCE_STREAM_NAME,
  onCopy: (m) => log.info({ seq: m.seq, ...describeForLog(m) }, "copied"),
}).catch((err: Error) => {
  // Exit, don't linger: the open NATS connections would keep the process
  // alive with a dead run loop, and `restart: unless-stopped` never fires.
  // A restart retries the durable, which a reboot can leave push-bound to
  // our own dead connection for minutes (#297). Not while shutting down:
  // that path owns the exit, and cutting its drain short leaves the
  // durable bound.
  log.error({ err: err.message }, "run failed");
  if (!shuttingDown) process.exit(1);
});

// Guarded against re-entry: a signal can be delivered more than once (e.g.
// a double Ctrl-C, or both SIGINT and SIGTERM arriving), and calling
// nc.drain() a second time on an already-draining connection throws.
// Draining source's connection also ends its subscription's iterator,
// which is what lets run()'s otherwise-indefinite loop return.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    await Promise.all([source.close(), sink.close()]);
    process.exit(0);
  });
}
