# qcic-infra

Manage the config and deployment of `qcic` related resources

Note:_Cloudflare scoped API token is injected into caddy container for DNS Challenge_

This includes:

- caddy
- nats:
  - nats.ts.imetrical.com (for port 4222)
  - also as nats.dl.imetrical.com externally on port 9222 wss://
  - no longer exposed externally on port 4222 (should use tailscale)
- status

## Usage

Use the makefile to properly expose HOSTALIAS (just for api natsql)

```bash
make # default target is status:= docker-compose ps
make status
make start
make web # open web pages for clients
make nats
make nats-top
```

## TODO

- Move to Kubernetes
  - [Talos docs/proxmox](https://www.talos.dev/docs/v0.11/virtualized-platforms/proxmox/)
  - [Talos on Proxmox](https://www.youtube.com/watch?v=MyxigW4_QFM&t=1s)
  - [OpenEBS on Talos hack sesh](https://www.youtube.com/watch?v=q86Kidk81xE)
  - k0s/k3s/microk8s
- backups: restic/duplicacy/litestream
- Add nats ( ws at port 9222) - test with Caddy - expose in qcic
- add ipfs, [graphana,hasura] (->timescale.ted)
- Point site(docz) to <https://qcic.n.imetrical.com> -> natsql.dl.imetrical.com
  - also qcic.dl.imetrical.com for local?dev?
  - Netlify for static instead of zeit/now/vercel
- Rename api->natsql - and add topic(\*)
- Better proxy for scrobblecast (than dirac.imetrical.com:8000)
- Move nested infra/README.md into mdx; make docs (published or not)
  - Include all names natsql.dl.imetrical.com, nats.dl.imetrical.com,...

## External monitoring

Note: _I deprecated and removed my account with EasyCron on 2021-09-04, and replaced it with BetterUptime's free tier_

Idea: monitor my own sites, from serverless functions (cloudflare/vercel) _pinger-lambda™_, and propagate results to my own data-source/prometheus/grafana, and also trigger heartbeats for BetterUptime, which would approximate Grafana WorldPing

### ./pubnub

This is not in a functional state

- pubnub should just be removed
- slack was using incoming webhooks, which are deprecated
- s3 was used for db, but is that really useful??

### BetterUptime

BetterUptime does periodic http checks, as well as monitor _heartbeats_.
Alarms are sent by email and on Slack. Incident responses are tracked.

[See current status](https://betteruptime.com/team/20855/monitors)

We monitor:

- <https://natsql.dl.imetrical.com/health>
- <https://scrobblecast.dl.imetrical.com/api/status>

### Worldping - grafana.com

Note: _Seems to be broken: should be removed_

We check DNS and https for each of these from three probes (London/NY,Silicon-Valley)
and have enable e-mail alerts for them.
For \*.dl.imetrical, this implies caddy is properly terminating ssl, and also assumes spdyn (ddclient) is up to date.

- [Dashboard](https://imetrical.grafana.net/)
- <https://api.qcic.n.imetrical.com/health> (going away zeit/now/v1)
- <https://natsql.dl.imetrical.com/health>
- <https://scrobblecast.dl.imetrical.com/api/status>

## Parts

### Caddy v2

Caddy now uses HTTP challenge to obtain LetsEncrypt certificates for external facing domains (_.dl.imetrical.com), but also DNS challenge (_.imetrical.net) whose DNS is controlled by Cloudflare DNS.

We also need to build our own image of caddy with the caddy:v2-builder image, to include the proper custom modules (for DNS provider adapters).

See `./Dockerfile-caddy` which was made from [these docs](https://hub.docker.com/_/caddy?tab=description)

Credentials are provided in the `docker-compose.yaml` and depend on each DNS provider.

- For Cloudflare, we expose gitignored `./credentials/caddy/CREDS.env` file with the CF_API_TOKEN environment variable.

```bash
# equivalent to our docker-compoose build for caddy
docker build -t ghcr.io/daneroo/caddy:2-dns -f Dockerfile-caddy .
```

We could build that (periodically) with a separate repo and Github Action.

Proxy server and tls endpoint for:

- <https://scrobblecast.dl.imetrical.com> → dirac.imetrical.com:8000
- <https://natsql.dl.imetrical.com> → dirac.imetrical.com:5000
- <https://localhost/> → Hello
- <https://syno-im.synology.me> → Hello
- <https://dl.imetrical.com> → Hello
- <https://gateway.imetrical.net> → Hello (internal IP uses cloudflare DNS challenge for cert)
- <https://gateway.ts.imetrical.net> → Hello (tailscale IP uses cloudflare DNS challenge for cert)

### status (cron)

This is accomplished by running a local scrapper
and republishing to zeit/now/vercel

- need to mount secrets for zeit/now/vercel, -t
- missing binary for `now`
  - `npm i -g --unsafe-perm now`
  - remove from Dockerfile when no longer publishing to now:
- make secrets later: inject credentials.json and ~/.now,

### api

this runs out graphql endpoint (port 5000)
