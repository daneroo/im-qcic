# QCIC - ui

This was forked from the [next.js](https://github.com/zeit/next.js/) [-with-apollo](https://github.com/zeit/next.js/tree/master/examples/with-apollo) example

It was enhanced to make GrapQL subscriptions work

## TODO
- Update to appollo v2.0
- Rename `lib` to `src`? organize `src/material`, `src/gql`
- about in markdown
- static deployment with no data? (netlify)

## Deploy to now
see ../README.md

## Deploy to netlify
```
npm run netlify
```
TL;DR
```
brew tap netlify/netlifyctl
brew install netlifyctl

## netlify.toml contains site-id, --base-directory is not stored there yet
netlifyctl deploy -b out
```

