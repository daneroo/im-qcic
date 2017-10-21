'use strict'
const { ApolloClient, createNetworkInterface } = require('apollo-client')
const WebSocket = require('ws')
const { addGraphQLSubscriptions, SubscriptionClient } = require('subscriptions-transport-ws')
const config = require('./config')

const authToken = Math.floor((Math.random() * 100000000) + 1)

// Subscriptions - Create WebSocket client
const wsClient = new SubscriptionClient(config.wsuri, {
  reconnect: true,
  connectionParams: {
    authToken: authToken
  }
}, WebSocket)

let networkInterface = addGraphQLSubscriptions(
  createNetworkInterface({
    uri: config.uri
  }),
  wsClient)

const authTokenMiddleware = {
  applyMiddleware (req, next) {
    if (!req.options.headers) {
      req.options.headers = {}
    }
    req.options.headers['authToken'] = authToken
    next()
  }
}
networkInterface.use([authTokenMiddleware])

const client = new ApolloClient({ networkInterface })

module.exports = client
// export { client as default, authToken }
