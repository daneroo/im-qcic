# `@daneroo/qcic-status`

Serves status content for qcic:

- tedcheck (missing sample for different time scopes)
- logcheck (scrobblecast digests)

Implemented with [fastify](https://www.fastify.io/docs/latest/Guides/Getting-Started/) and [pino](https://getpino.io/#/docs/web?id=fastify)

## TODO

- broadcast logs to nats topic (im.logs.???)
- refactor routes
  - add schema to routes
  - proxy to nats responders instead?
- add status to caddy (status.dl.imetrical.com)
- add weight ?

## Usage

```bash
# for development
node src/server.js | pino-pretty -S -t # or -t SYS:standard

# smoke test
npm run smoke
```
