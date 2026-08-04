import { JSONCodec } from "nats";
import {
  config,
  DEST_STREAM_NAME,
  SOURCE_STREAM_NAME,
  rewriteSubject,
} from "./config";
import { createScastSink } from "./scast-sink";
import { createScrobblecastSource } from "./scrobblecast-source";
import { run, type BridgeMessage } from "./bridge";
import { log } from "./logger";

const source = createScrobblecastSource(config.natsProd);

log.info({ windowMs: config.initialWindowMs }, "starting");

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

run({
  messages: source.subscribe(config.initialWindowMs),
  sink,
  rewriteSubject,
  msgIdPrefix: SOURCE_STREAM_NAME,
  onCopy: (m) => log.info({ seq: m.seq, ...describeForLog(m) }, "copied"),
}).catch((err: Error) => {
  log.error({ err: err.message }, "run failed");
  process.exitCode = 1;
});

// Guarded against re-entry: a signal can be delivered more than once (e.g.
// a double Ctrl-C, or both SIGINT and SIGTERM arriving), and calling
// nc.drain() a second time on an already-draining connection throws.
// Draining source's connection also ends its subscription's iterator,
// which is what lets run()'s otherwise-indefinite loop return.
let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "shutting down");
    await Promise.all([source.close(), sink.close()]);
    process.exit(0);
  });
}
