# network

The `/network` page presents the selected Strata reading order: Endpoints, NATS,
then Tailnet. Each stratum keeps its own source and knowledge state; a failed
observation path makes retained detail unverifiable rather than alarming.

## Module shape

- `../health/` owns the browser's public HTTP bootstrap, public NATS stream, and
  `im-qcic-health` KV feed.
- `derive.ts` owns pure Tailnet and endpoint-probe roll-ups.
- `fixture.ts` contains only the endpoint and heartbeat readings that remain
  recorded shapes.
- `NetworkPage.tsx` renders live NATS and Tailnet detail without reaching
  `/varz`, `/connz`, or Tailscale LocalAPI from the browser.

For local development, the defaults match `v2/infra/compose.yaml`:

- `VITE_NATS_WS_URL=ws://localhost:9222`
- `VITE_HEALTH_HTTP_URL=http://localhost:8000/healthz`

For review from another device, both browser-facing URLs must name the Docker
host rather than that device's localhost:

```sh
VITE_NATS_WS_URL=ws://<docker-host>:9222 \
VITE_HEALTH_HTTP_URL=http://<docker-host>:8000/healthz \
bun --bun vite dev --port 3000 --host 0.0.0.0
```
