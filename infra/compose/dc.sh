#/bin/bash

# docker-compose base name === -p <project_name>
export COMPOSE_PROJECT_NAME=qcic

docker-compose \
  -f base.yaml \
  -f ddclient.yaml \
  -f nats-server.yaml \
  -f status-cron.yaml \
  "$@"

