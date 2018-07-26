# QCIC - ui

This was forked from the [next.js](https://github.com/zeit/next.js/) [-with-apollo](https://github.com/zeit/next.js/tree/master/examples/with-apollo) example

It was enhanced to make GrapQL subscriptions work

## TODO
- Update to appollo v2.0
- Rename `lib` to `src`? organize `src/material`, `src/gql`
- about in markdown
- static deployment with no data? (netlify)

### Deploy to zeit/now
```
npm run deploy
npm run logs
```
in detail:
```
now --public   # deploy
now alias      # aliases latest deployment
now rm --safe ui-qcic  # cleanup

# lookup first istance and tail -ts logs
now logs -f $(now ls ui-qcic 2>/dev/null | tail +2 | head -1 |  awk '{print $2}')
```

## num locally
```
npm install
npm run dev
```


## Deploy to netlify
```
npm run netlify
```

## Tool setup
TL;DR
```
brew tap netlify/netlifyctl
brew install netlifyctl

## netlify.toml contains site-id, --base-directory is not stored there yet
netlifyctl deploy -b out
```

