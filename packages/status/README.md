# `@daneroo/qcic-status`

This repo simply publishes scraped `.json` files for status of components.

## TODO

- Dockerize scrape&build for cron
- expose as a service / resolver, for inclusion in api?

## Usage

```bash
npm start      # scrape: get the .json files
npm run deploy # deploy: to now

npm run cron   # scrape, deploy every 10 minutes
# equivalent to
while true; do npm start; npm run deploy; echo; echo done $(date); sleep 600; done
```

## Publish statis

Thought I might have to add to: `now.json`, but seems to work without.

```json
  "builds": [
    { "src": "*", "use": "@now/static" }
  ]
```