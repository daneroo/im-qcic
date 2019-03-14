# `@daneroo/qcic-status`

The idea is to publish a site, on a cron schedule, or on some other trigger.

## docz and webpack

- Until fix use yarn to `install`
- To convert `yarn.lock` to `package-lock.json``npx synp --source-file yarn.lock`
- Move mdx to seperate deck and docz

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

while true; do npm start; npm run deploy; echo; echo done $(date); sleep 600; done
```


For dev:

```bash
npm run docz:dev
# rinse repeat
npm run scrape
```
