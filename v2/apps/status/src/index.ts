import { app } from "./app";
import { config } from "./config";
import { log } from "./logger";

const server = Bun.serve({ fetch: app.fetch, port: config.port });
log.info({ port: config.port }, "listening");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    log.info({ signal }, "shutting down");
    await server.stop();
    process.exit(0);
  });
}
