# The browser reads application detail only from NATS

Every detailed live signal QCIC displays reaches the browser over NATS. Where a
signal has some other origin — a MySQL table, another NATS server, a shell
command, or an HTTP admin endpoint — a small collector owns that origin and
publishes into NATS. `health`, `ted1k-derive`, and `scast-bridge` follow this
pattern.

`health` also exposes one deliberately coarse public HTTP reading. The static
browser uses it as a bootstrap and fallback before continuing with the public
NATS stream; it never reaches NATS monitoring or Tailscale LocalAPI directly.

## Considered options

NATS's own monitoring endpoints (`/varz`, `/connz`) are plain HTTP and serve
`Access-Control-Allow-Origin: *`, so the browser could fetch them directly and
skip a collector entirely. Rejected as the standing pattern for three reasons:

- Those endpoints disclose server internals — connected client IPs, per-connection
  subjects, server version and git commit. Making them work in production means
  publishing that port through Caddy, which publishes all of it.
- It would establish a second ingestion path alongside the bus, so every future
  signal starts with an argument about which one it uses.
- A collector exists regardless: Tailnet state comes from Tailscale LocalAPI,
  reached through a read-only Unix-socket mount on Linux/Synology or authenticated
  host LocalAPI on macOS.

## Consequences

`apps/health` owns `/varz`, `/connz`, and Tailscale LocalAPI. It publishes NATS
and Tailnet detail to `im-qcic-health`, publishes coarse health to the public
health stream, and answers both HTTP and NATS coarse requests from the same
in-memory observations.

The page's fixture note must always name exactly which endpoint readings remain
recorded. Blending live and recorded readings is allowed; blending them silently
is not.
