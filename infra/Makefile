

start:
	echo "start component"

ttabs:
	echo "ttabs"
	npx ttab -d "$(shell pwd)/../nats" nats-top
	echo npx ttab -d "$(shell pwd)/../packages/status" npm run cron
	echo npx ttab -d "$(shell pwd)/../packages/api" npm start
