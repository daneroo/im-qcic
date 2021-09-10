# qcic-infra

Manage the config and deployment of `qcic` related resources

## Usage

Use the makefile to properly expose HOSTNAME (just for api server)

```bash
make # default target is status:= docker-compose ps
make status
make start
make web # open web pages for clients
make tabs
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

### EasyCron

- [EasyCron Dashboard](https://www.easycron.com/user)
- <https://natsql.dl.imetrical.com/health>
- <https://scrobblecast.dl.imetrical.com/api/status>

### Worldping - grafana.com

We check DNS and https for each of these from three probes (London/NY,Silicon-Valley)
and have enable e-mail alerts for them.
For \*.dl.imetrical, this implies caddy is properly terminating ssl, and also assumes spdyn (ddclient) is up to date.

- [Dashboard](https://imetrical.grafana.net/)
- <https://api.qcic.n.imetrical.com/health> (going away zeit/now/v1)
- <https://natsql.dl.imetrical.com/health>
- <https://scrobblecast.dl.imetrical.com/api/status>

## Parts

### caddy

Proxy server and tls endpoint for:

- <https://scrobblecast.dl.imetrical.com>: dirac.imetrical.com:8000
- <https://natsql.dl.imetrical.com>: dirac.imetrical.com:5000
- <https://localhost/> -> Hello
- <https://dl-imetrical.spdns.org> -> Hello
- <https://dl.imetrical.com> -> Hello

### ddclient (moved from im-ddclient)

See README in `./config/ddclient` including restart directives

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
