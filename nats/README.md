# Nats

- This is a simple node client for nats
  - This is where I start my shared `nats` instance, if none is already started
  - The nats service is run on `dirac`, and is exposed at `dl.imetrical.com:4222`

## References

- [nats cli](https://github.com/nats-io/natscli)
- [node-nats](https://github.com/nats-io/node-nats)
- [Go-nats](https://github.com/nats-io/go-nats)

## Operating

```bash
make start # if required
make stop # if required
make test # both smoke and speed
make smoke-test
make speed-test

npm start # start the node client (publish and subscribe)
```

## Starting a local server

_equivalent to:_ `make start`.

- 4222 is for clients. Exposed at large (No auth yet)
- 8222 is an HTTP management port for information reporting.
- 6222 is a routing port for clustering. NOT EXPOSED

```bash
docker-compose up -d
```

## Smoke tests

This just establishes a connection to the monitoring port.

You can install `nats-top` with `go install github.com/nats-io/nats-top@latest`

```bash
nats-top
nats-top -s dirac.imetrical.com

#this should not work (8222 is not published)
nats-top -s dl.imetrical.com
```

This uses the nats bench (`make smoke-test`):

```bash
nats bench --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test
nats bench -s nats://dirac.imetrical.com:4222 --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test
nats bench -s nats://dl.imetrical.com:4222 --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test
```
