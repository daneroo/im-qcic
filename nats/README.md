# Nats

- [node-nats](https://github.com/nats-io/node-nats)
- [Go-nats](https://github.com/nats-io/go-nats)

## starting a local server

- 4222 is for clients.
- 8222 is an HTTP management port for information reporting.
- 6222 is a routing port for clustering.

```
docker run -d --name nats -p 4222:4222 -p 8222:8222 nats
```

Smoke test:
- https://nats.io/documentation/tutorials/nats-benchmarking/
```
# go get github.com/nats-io/nats-top
nats-top

# go build $GOPATH/src/github.com/nats-io/go-nats/examples/nats-bench.go
# -=-= PUB
./nats-bench -np 1 -n 100000 -ms 16 foo
# -=-= PUB - SUB
./nats-bench -np 1 -ns 1 -n 100000000 -ms 16 foo
# -=-= PUB - SUB 1:N
./nats-bench -np 1 -ns 5 -n 100000000 -ms 16 foo

# cd $GOPATH/src; mkdir -p github\.com/nats-io && cd github.com/nats-io
# git clone git@github.com:nats-io/gnatsd.git
# git clone git@github.com:nats-io/go-nats.git
go get github.com/nats-io/nuid
```