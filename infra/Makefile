
# important for api (for now)
export HOSTNAME=$(shell hostname -s)

usage: status
	@echo "Make all the things: status, build, start, web, nats"

status:
	docker-compose ps

build:
	docker-compose build --pull

start:
	docker-compose up -d

nats-top:
	nats-top -s nats.ts.imetrical.com

nats:
	nats -s nats.ts.imetrical.com sub -r im.\>

web:
	open https://qcic.n.imetrical.com/
	open https://docz.qcic.n.imetrical.com/#scrobblecast
	open http://imetrical.appspot.com/s/p/www-6bc.html
