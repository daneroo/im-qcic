# `@daneroo/qcic-status`

The idea is to publish a site, on a cron schedule, or on some other trigger.

1. Scrape data to local json/mdx
2. Docz to get data out
3. Dockerize scrape&build for cron
4. Use gatsby and some external GraphQL sources instead

## Usage

To Publish:

```bash
npm start
## equivalent
npm run scrape
npm run docz:build
```


For dev:

```bash
npm run docz:dev
# rinse repeat
npm run scrape
```
