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

- Caddy v2 in docker and config for qcic-api/scrobblecast-js
- Move nested README into mdx; make docs (published or not)
- Decide where to put nats compose.yaml (previously in im-qcic/nats)
- remove nats config file from im-qcic/nats

## Parts

- nats-top - re-export to nats?
- qcic-api (currently npm -start)

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
