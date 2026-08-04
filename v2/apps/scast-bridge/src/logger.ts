import pino from "pino";

// JSON to stdout, matching v2/apps/status's convention - except the
// timestamp: pino defaults to epoch-ms under "time", but this whole NATS
// ecosystem (scrobblecast's own publish() envelope, im-ted1k's message
// struct) always uses ISO8601 UTC under "stamp". Matching that here too,
// for a consistent log-reading experience across services.
export const log = pino({
  timestamp: () => `,"stamp":"${new Date().toISOString()}"`,
});
