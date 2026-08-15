# health

`apps/health` independently observes NATS and Tailnet, keeps current-enough
in-memory readings, and serves the same coarse public projection over HTTP and
NATS. Detailed values are published to NATS for `apps/web`; the browser never
reads NATS monitoring or Tailscale LocalAPI directly.

## Contracts

- `GET /healthz`: coarse public JSON; `200` only when both observations are
  available, otherwise `503`; always `Cache-Control: no-store` and public CORS.
- `pub.im.qcic.health.stream`: coarse readings retained for at most one minute.
- `pub.im.qcic.health.request`: uncaptured request/reply in queue group
  `pub.im.qcic.health`.
- `im-qcic-health`: private detail under exactly `nats` and `tailnet`.

NATS and Tailnet have separate freshness windows, retained detail, timestamps,
and availability. Each public availability field carries its own `observedAt`;
cached responses repeat the subsystem's actual check time rather than the HTTP
reply time. `available` is the observer's current-enough verdict under its
configured freshness window; consumers do not reinterpret that verdict using
hard-coded probe ages. Defaults are:

- publish every 10 seconds (`PUBLISH_INTERVAL_MS`)
- NATS fresh for 10 seconds (`NATS_FRESHNESS_MS`)
- Tailnet fresh for 30 seconds (`TAILNET_FRESHNESS_MS`)
- each operation bounded to 2 seconds (`PROBE_TIMEOUT_MS`)

## Development

From `v2/infra`:

```sh
# macOS: refreshes a gitignored mode-0600 LocalAPI credential, then starts
just macos-up -d --build health

# Linux/NixOS/Ubuntu: mounts the standard socket by default
just compose up -d --build health

# Synology: select the package socket explicitly
TAILSCALE_LOCALAPI_SOURCE=/var/packages/Tailscale/var/tailscaled.sock \
just compose up -d --build health
```

The macOS helper calls the higher-level `tailscale debug local-creds` interface,
parses its curl command with a tested parser, and writes only to the gitignored
`infra/credentials/credentials.tailscale-localapi.json`. Override the app binary
location with `TAILSCALE_CLI` if it is not installed at the standard app path.
