# network

The `/network` subject reports the three dependency rungs in the selected Strata
reading order: services, bus, then fabric. The page starts with what a person
came for and reads down into its substrate. A failed substrate makes the
readings above it unverifiable; it does not prove those subjects are faulty.

## Module shape

- `types.ts` is the wire contract the network collector will eventually publish.
- `derive.ts` owns the pure fabric and probe roll-ups and is tested at that
  public seam.
- `fixture.ts` holds only the fabric and services readings the browser cannot
  currently observe.
- `direct-monitoring-source.ts` is the named, temporary exception to
  [ADR-0004](../../../../../docs/adr/0004-browser-reads-only-from-the-bus.md).
  It reads NATS `/varz` and `/connz` directly until the network collector
  replaces it.

For local development, `VITE_NATS_MONITOR_URL` defaults to
`http://localhost:8222`, matching `v2/infra/compose.yaml`.

For review from another device, both browser-facing NATS URLs must name the
Docker host rather than that device's localhost:

```sh
VITE_NATS_WS_URL=ws://<docker-host>:9222 \
VITE_NATS_MONITOR_URL=http://<docker-host>:8222 \
bun --bun vite dev --port 3000 --host 0.0.0.0
```
