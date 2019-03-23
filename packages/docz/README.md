# `@daneroo/qcic-docz`

Static site  (docz) to publish qcic status

## TODO

- Move components to own lerna sibling package
  - <https://parastudios.de/create-a-react-component-as-npm-module/>
- Dynamic GraphQL content
  - see gatsby-trials, and also
  - <https://github.com/hasura/demo-apps>
  - which includes a nice Caddy proxy
  - pulls in <https://github.com/hasura/graphql-engine>/community/*
- Better Injecter (propagating [props with control])
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

## docz and webpack - dependancy problem (fixed in )

Redo install with yarn

tl;dr  `npm run fix`  

- `webpack` bug with `npm install`  
- Waiting for docz:v0.14
- <https://github.com/pedronauck/docz/issues/596">
