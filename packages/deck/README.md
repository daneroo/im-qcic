# `@daneroo/qcic-deck`

Static site (mdx-deck) to publish qcic status

## TODO

## Usage

To Publish:

```bash
npm run deploy
```

## Webpack and apollo client w/subscription

When importing apollo client modules, I had to add a custom webpack config:

- mdx-webpack: <https://github.com/jxnblk/mdx-deck/blob/master/docs/advanced.md>
- graphql-js: <https://github.com/graphql/graphql-js/issues/1272#issuecomment-393903706>

And this sketchy fix to make these two warning go away:
- <https://github.com/apollographql/subscriptions-transport-ws/issues/56#issuecomment-313654123>

```
new webpack.IgnorePlugin(/utf-8-validate|bufferutil/)
```
warning  in ./node_modules/subscriptions-transport-ws/node_modules/ws/lib/buffer-util.js

Module not found: Error: Can't resolve 'bufferutil' in '.../subscriptions-transport-ws/node_modules/ws/lib'

 warning  in ./node_modules/subscriptions-transport-ws/node_modules/ws/lib/validation.js

Module not found: Error: Can't resolve 'utf-8-validate' in '.../subscriptions-transport-ws/node_modules/ws/lib'

