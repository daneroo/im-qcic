# Nats

- This is where I start my shared `nats` instance.
- The nats service is run on `dirac`, and is exposed at `dl.imetrical.com:4222`


## Refereneces
- [node-nats](https://github.com/nats-io/node-nats)
- [Go-nats](https://github.com/nats-io/go-nats)

## Operating
```
make start
make stop
make test # both smoke and speed
make smoke-test
make speed-test
make clean
```

## Starting a local server
_equivalent to:_ `make start`.

- 4222 is for clients. Exposed at large (No auth yet)
- 8222 is an HTTP management port for information reporting.
- 6222 is a routing port for clustering. NOT EXPOSED

```
docker-compose up -d
```

## Smoke tests
This just establishes a connection to the monitoring port.

You can install `nats-top` with `go get github.com/nats-io/nats-top`
```
nats-top
nats-top -s dirac.imetrical.com

#this should not work (8222 is not published)
nats-top -s dl.imetrical.com
```

This uses the nats-bench:
```
./nats-bench -np 1 -ns 1 -n 100 -ms 1024 smoke-test
./nats-bench -s dirac.imetrical.com -np 1 -ns 1 -n 100 -ms 1024 smoke-test
./nats-bench -s dl.imetrical.com -np 1 -ns 1 -n 100 -ms 1024 smoke-test
```
- https://nats.io/documentation/tutorials/nats-benchmarking/

```
# -=-= PUB
./nats-bench -np 1 -n 100000 -ms 16 foo
# -=-= PUB - SUB
./nats-bench -np 1 -ns 1 -n 100000000 -ms 16 foo
# -=-= PUB - SUB 1:N
./nats-bench -np 1 -ns 5 -n 100000000 -ms 16 foo
```