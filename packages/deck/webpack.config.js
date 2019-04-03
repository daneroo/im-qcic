// mdx-webpack: https://github.com/jxnblk/mdx-deck/blob/master/docs/advanced.md
// graphql-js: https://github.com/graphql/graphql-js/issues/1272#issuecomment-393903706
// warning for subscriptions-transport-ws: utf-8-validate|bufferutil
//   https://github.com/apollographql/subscriptions-transport-ws/issues/56#issuecomment-313654123
var webpack = require('webpack')

module.exports = {
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      }
    ]
  },
  resolve: {
    extensions: ['.webpack.js', '.web.js', '.mjs', '.js', '.json']
  },
  plugins: [
    new webpack.IgnorePlugin(/utf-8-validate|bufferutil/)
  ]
}
