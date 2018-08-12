
.PHONY: start
start:
	docker-compose up -d

.PHONY: stop
stop:
	docker-compose down

.PHONY: test
test: smoke-test speed-test

.PHONY: speed-test
speed-test: nats-bench
	@echo Testing speed 1e6 msg*16B
	./nats-bench -np 1 -ns 1 -n 1000000 -ms 16 speed-test

	@echo
	@echo Testing speed 1e6 msg*128B
	./nats-bench -np 1 -ns 1 -n 1000000 -ms 128 speed-test
	@echo
	@echo Testing speed 1e6 msg*1KB
	./nats-bench -np 1 -ns 1 -n 1000000 -ms 1024 speed-test

.PHONY: smoke-test
smoke-test: nats-bench
	@echo Testing on localhost:4222 1000 msg*1KB
	./nats-bench -np 1 -ns 1 -n 1000 -ms 1024 smoke-test

	@echo
	@echo Testing on dirac:4222 1000 msg*1KB
	./nats-bench -s nats://dirac.imetrical.com:4222 -np 1 -ns 1 -n 1000 -ms 1024 smoke-test

	@echo
	@echo Testing on dl.imetrical.com:4222 1000 msg*1KB
	./nats-bench -s nats://dl.imetrical.com:4222 -np 1 -ns 1 -n 1000 -ms 1024 smoke-test

nats-bench:
	go get github.com/nats-io/go-nats
	go build $$GOPATH/src/github.com/nats-io/go-nats/examples/nats-bench.go

clean:
	rm -f ./nats-bench