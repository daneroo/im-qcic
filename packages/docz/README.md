# `@daneroo/qcic-docz`

Static site  (docz) to publish qcic status

## TODO

- Fix the logo (static assets in /public for docz:dev)
- kWh/d
- Add im-weight, backblaze, CCC, gmvault,
- Summary with top metrics, and reuse data in multiple places
- Theming
- tests

## Usage

To develop:

```bash
npm start
```

To publish:

```bash
npm run deploy
```

## Zeit/now redirect

To have [proper redirects](https://zeit.co/docs/v2/deployments/routes/) 
for non `/` routes, in your `now.json`:

```json
"routes": [
  { "src": "/index.html" },
  { "src": "/assets.json" },
  { "src": "/public/(.*)" },
  { "src": "/static/(.*)" },
  { "src": "/(.*)", "dest": "/" }
]
```

## docz and webpack - dependancy problem (fixed in )

Fixed in dockz v1.0.1

tl;dr  

`npm run fix`  was my solution

<https://github.com/pedronauck/docz/issues/704>

Note: _need to use qcic_react..._

`mkdir -p node_modules/@daneroo; ln -sf ../react/ node_modules/@daneroo/qcic-react`

```bash
rm -rf package-lock.json node_modules && \
yarn install && \
npm i --package-lock-only # recreates package-lock.json
```

- `webpack` bug with `npm install`  
- Waiting for docz:v0.14
- <https://github.com/pedronauck/docz/issues/596">
