
# important for api (for now)
export HOSTNAME=$(shell hostname)

usage: status
	@echo "Make all the things: status, start, web, tabs, tab-*"

status:
	docker-compose ps

start:
	docker-compose up -d

web:
	open https://docz.qcic.n.imetrical.com/#scrobblecast
	open http://imetrical.appspot.com/s/p/www-6bc.html
	open https://ui.qcic.n.imetrical.com/

tabs: tab-nats-top tab-status-cron tab-ddclient
	@echo 3 terminal tabs open

tab-nats-top:
	npx ttab -t nats-top -d "$(shell pwd)" nats-top

tab-status-cron:
	npx ttab -t nats-top -d "$(shell pwd)" docker-compose logs -f status

tab-ddclient:
	npx ttab -t nats-top -d "$(shell pwd)" docker-compose logs -f ddclient
