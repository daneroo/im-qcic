# qcic-infra

Manage the config and deployment of `qcic` related resources

- Experiment with GitOps patterns
- Perhaps move to kubernetes
- Profiles on different hosts/clusters

## TODO

- Move nested README into mdx; make docs (published or not)
- Decide where to put nats compose.yaml (previously in im-qcic/nats)
- remove nats config file from im-qcic/nats
- Dockerize status cron (an exporter)
- Dockerize api (local)
- integrate hasura (compose.yaml in im-qcic/status)
- Decide on strategy for secrets

### nats (server)

- moved from im-qcic/nats

### Dockerize status cron

- need to mount secrets for NOW, -t
- missing binary for `now`
  - `npm i -g --unsafe-perm now`
  - remove from Dockerfile when no longer publishing to now:
- make secrets later: inject credentials.json and ~/.now, 

```bash
# run from status dir
docker run --name status-cron --rm -it -v $(pwd):/usr/src/app node:11 bash -c "cd /usr/src/app; npm i -g now; npm run cron"
```

### ddclient (moved from im-ddclient)

See old README in `./config/ddclient`

## Usage

First implementation is using docker-compose,
modeled on [Hasura's demo apps](https://github.com/hasura/demo-apps.git)

```bash
make start

make ttabs
```

## Parts

- qcic-status: npm run cron (in a container?)
- qcic-nats: no image, just docker-compose, and node smoke tests
- nats-top - re-export to nats?
- qcic-api (currently npm -start)
- im-ddclient: separate repo, merge? No artifact only config - could still contain dc.yaml or chart

## References

- [Hasura's demo apps](https://github.com/hasura/demo-apps.git)
