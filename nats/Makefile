
.PHONY: start
start:
	docker-compose up -d

.PHONY: stop
stop:
	docker-compose down

.PHONY: test
test: smoke-test speed-test

.PHONY: speed-test
speed-test: nats-cli-exists
	@echo Testing speed 1e6 msg*16B
	nats bench --pub 1 --sub 1 --msgs 1000000 --size 16 speed-test

	@echo
	@echo Testing speed 1e6 msg*128B
	nats bench --pub 1 --sub 1 --msgs 1000000 --size 128 speed-test
	@echo
	@echo Testing speed 1e6 msg*1KB
	nats bench --pub 1 --sub 1 --msgs 1000000 --size 1024 speed-test

.PHONY: smoke-test
smoke-test: nats-cli-exists
	@echo Testing on localhost:4222 1000 msg*1KB
	nats bench --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test
	@echo
	@echo Testing on dirac:4222 1000 msg*1KB
	nats bench -s nats://dirac.imetrical.com:4222 --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test

	@echo
	@echo Testing on dl.imetrical.com:4222 1000 msg*1KB
	nats bench -s nats://dl.imetrical.com:4222 --pub 1 --sub 1 --msgs 1000 --size 1024 smoke-test

.PHONY: nats-cli-exists
nats-cli-exists:
	@which nats > /dev/null || (echo "Install nats client and run again: brew install nats-io/nats-tools/nats"; exit 1)
