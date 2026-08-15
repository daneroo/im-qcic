import { createApp } from "./app";
import { config } from "./config";
import { createHealthObserver } from "./health";
import { createLocalApi } from "./local-api";
import { log } from "./logger";
import { createNatsProbe } from "./nats-probe";
import { createNatsPublisher } from "./nats-publisher";
import { createPublicationLoop } from "./publication-loop";
import { createTailnetProbe } from "./tailnet-probe";

const health = createHealthObserver({
  observer: config.observer,
  natsFreshnessMs: config.natsFreshnessMs,
  tailnetFreshnessMs: config.tailnetFreshnessMs,
  probeNats: createNatsProbe({
    baseUrl: config.natsMonitorUrl,
    timeoutMs: config.probeTimeoutMs,
  }),
  probeTailnet: createTailnetProbe({
    localApi: createLocalApi(config.tailscale),
    timeoutMs: config.probeTimeoutMs,
  }),
});

const app = createApp(health);
const server = Bun.serve({ fetch: app.fetch, port: config.port });
log.info({ observer: config.observer, port: config.port }, "listening");

const publication = createPublicationLoop({
  health,
  connect: () =>
    createNatsPublisher({
      servers: config.natsServers,
      timeoutMs: config.probeTimeoutMs,
      health,
      onError: (error, operation) =>
        log.error({ error, operation }, "NATS request handler failed"),
    }),
  onError: (error) =>
    log.warn({ error }, "NATS publication unavailable; will retry"),
});

void publication.tick();
const timer = setInterval(() => {
  void publication.tick();
}, config.publishIntervalMs);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    log.info({ signal }, "shutting down");
    clearInterval(timer);
    await publication.close();
    await server.stop();
    process.exit(0);
  });
}
