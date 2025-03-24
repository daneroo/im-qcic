
# important for api (for now)
export HOSTNAME=$(shell hostname -s)

usage: status
	@echo "Make all the things: status, build, start, web, nats"

status:
	docker compose ps

# add a build timeout for synology: unbeleivably slow
build:
	docker compose build --pull
	@echo "if this fails (on synology)"
	@echo "COMPOSE_HTTP_TIMEOUT=300 docker compose build caddy"
	@echo "COMPOSE_HTTP_TIMEOUT=300 docker compose build nats"
	@echo "COMPOSE_HTTP_TIMEOUT=300 docker compose build natsql"
	@echo "COMPOSE_HTTP_TIMEOUT=300 docker compose build status"

start:
	docker compose up -d

nats-top:
	nats-top -s nats.ts.imetrical.com

nats:
	nats -s nats.ts.imetrical.com sub -r im.\>

web:
	open https://qcic.v.imetrical.com/
	open http://imetrical.appspot.com/s/p/www-6bc.html
