
# other envs: CREDs.env (.gitgnored)
export HOSTNAME=$(shell hostname)

COMPOSE_CMD=docker-compose --env-file=CREDS.env
DOCKER_CMD=docker
usage: status
	@echo "Make all the things: status, up down, start, exec,..."

status:
	${COMPOSE_CMD} ps

start: up

up:
	${COMPOSE_CMD} up -d

exec:
	${COMPOSE_CMD} exec ubuntu bash

down:
	${COMPOSE_CMD} down

clean: down
	${DOCKER_CMD} volume rm backups_drobo


