#/bin/bash


(cd compose; ./dc.sh up -d)

## Start logs, etc
npx ttab -t nats-top -d "$(pwd)" nats-top
npx ttab -t nats -d "$(pwd)/compose" ./dc.sh logs -f nats
npx ttab -t status-cron -d "$(pwd)/compose" ./dc.sh logs -f status

npx ttab -t ddclient -d "$(pwd)/compose" ./dc.sh logs -f ddclient

open https://ui.qcic.n.imetrical.com/

# show components and status
(cd compose; ./dc.sh ps)

echo
echo "More commands:"
echo "(cd compose; ./dc.sh command)"


