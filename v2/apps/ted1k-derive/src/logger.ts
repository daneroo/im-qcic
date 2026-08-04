import pino from "pino";

// JSON to stdout - matches v2/apps/scast-bridge's convention: pino defaults
// to epoch-ms under "time", but this whole NATS ecosystem always uses
// ISO8601 UTC under "stamp".
export const log = pino({
  timestamp: () => `,"stamp":"${new Date().toISOString()}"`,
});
