# CLI client for graphql endpint

Setup:

```bash
cd cli
npm install
```

Start locally: depends on `../api` started locally

```bash
npm start
```

Start and point at deployed api

```bash
npm start  # default is https://localhost:5000

BASEURI=https://api.qcic.n.imetrical.com npm start  # now v1 api (going away)
BASEURI=https://natsql.dl.imetrical.com npm start # proxied by Caddy to dirac:5000
BASEURI=http://localhost:5000 npm start  # local api dev
```
