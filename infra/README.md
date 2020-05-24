# qcic-infra

Manage the config and deployment of `qcic` related resources

## Usage

Use the makefile to properly expose HOSTNAME (just for api server)

```bash
make # default target is satus
make status
make start
make web # open web pages for clients
make tabs
```

## TODO

- Better proxy for scrobblecast (than dirac.imetrical.com:8000)
- Move nested infra/README.md into mdx; make docs (published or not)

## Worldping - graphana.com

We check DNS and https for each of these from three probes (London/NY,Silicon-Valley)
and have enable e-mail alerts for them.
For \*.dl.imetrical, this implies caddy is properly terminating ssl, and also assumes spdyn (ddclient) is up to date.

- [Dashboard](https://imetrical.grafana.net/)
- https://api.qcic.n.imetrical.com/health
- https://natsql.dl.imetrical.com/health
- https://scrobblecast.dl.imetrical.com/api/status

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
