# `@daneroo/qcic-status`

This repo simply publishes scraped `.json` files for status of components.

## TODO

- Hasura experiment: promote or cleanup
- [Auto apply migrations/metadata](https://docs.hasura.io/1.0/graphql/manual/migrations/auto-apply-migrations.html)
- expose as a service / resolver, for inclusion in api?
- add <https://im-weight.herokuapp.com/backup>

## Usage

```bash
npm start      # scrape: get the .json files
npm run deploy # deploy: to now

npm run cron   # scrape, deploy every 10 minutes
# equivalent to
while true; do npm start; npm run deploy; echo; echo done $(date); sleep 600; done
```

## Hasura as a caching proxy with subscriptions

```bash
docker-compose up -d
while true; do time node src/store.js ; sleep 5; done
```

## Publish static

Thought I might have to add to: `now.json`, but seems to work without.

```json
  "builds": [
    { "src": "*", "use": "@now/static" }
  ]
```