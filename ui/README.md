# QCIC - ui

This was forked from the [next.js](https://github.com/zeit/next.js/) [-with-apollo](https://github.com/zeit/next.js/tree/master/examples/with-apollo) example

It was enhanced to make GrapQL subscriptions work

## TODO

- Update to appollo v2.0
- Rename `lib` to `src`? organize `src/material`, `src/gql`
- about in markdown
- static deployment with no data? (netlify) or now v2/static buid

### Deploy to zeit/now

```bash
npm run deploy
npm run logs
```

in detail:

```bash
now --public   # deploy
now alias      # aliases latest deployment
now rm --safe ui-qcic  # cleanup

# lookup first istance and tail -ts logs
now logs -f $(now ls ui-qcic 2>/dev/null | tail +2 | head -1 |  awk '{print $2}')
```

## Run locally

If you want to sun against a locally deploy api, edit `./lib/congig.js`
I haven't figured out how to inject this from a an npm script, because this value is read in the browser, and doesn;t have access to process.env

```bash
npm install
npm run dev
```

## Deploy to netlify

```bash
npm run netlify
```

## Tool setup

TL;DR

```bash
brew tap netlify/netlifyctl
brew install netlifyctl

## netlify.toml contains site-id, --base-directory is not stored there yet
netlifyctl deploy -b out
```

