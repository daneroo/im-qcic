# The browser reads only from the bus

Every signal QCIC displays reaches the browser over NATS. Where a signal has some
other origin — a MySQL table, another NATS server, a shell command, an HTTP admin
endpoint — a small collector service owns that origin and publishes into a KV
bucket, and the browser consumes the bucket. `ted1k-derive` and `scast-bridge`
already work this way; the network page's tailnet, bus and probe readings will
too.

## Considered options

NATS's own monitoring endpoints (`/varz`, `/connz`) are plain HTTP and serve
`Access-Control-Allow-Origin: *`, so the browser could fetch them directly and
skip a collector entirely. Rejected as the standing pattern for three reasons:

- Those endpoints disclose server internals — connected client IPs, per-connection
  subjects, server version and git commit. Making them work in production means
  publishing that port through Caddy, which publishes all of it.
- It would establish a second ingestion path alongside the bus, so every future
  signal starts with an argument about which one it uses.
- A collector has to exist regardless: tailnet state comes from the Tailscale
  daemon, which cannot be reached from inside a container. Once something is
  running host-side for that, the bus counters cost nothing to carry along.

## Consequences

Until that collector exists, the network page's bus rung fetches `/varz` and
`/connz` from the browser directly. That is a deliberate, temporary placeholder —
chosen over fixture data because the signal is genuinely available — and not an
instance of the pattern. It comes out when the collector lands.

The page's fixture note must always name exactly which rungs are not live.
Blending live and recorded readings is allowed; blending them silently is not.
