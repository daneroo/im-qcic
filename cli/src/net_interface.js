import { ApolloClient, createNetworkInterface } from 'apollo-client'
import WebSocket from 'ws'
import { addGraphQLSubscriptions, SubscriptionClient } from 'subscriptions-transport-ws'
import config from './config'

const authToken = Math.floor((Math.random() * 100000000) + 1)

// Subscriptions - Create WebSocket client
const wsClient = new SubscriptionClient(config.wsuri, {
  reconnect: true,
  connectionParams: {
    authToken: authToken
  }
}, WebSocket)

const authTokenMiddleware = {
  applyMiddleware (req, next) {
    if (!req.options.headers) {
      req.options.headers = {}
    }
    req.options.headers['authToken'] = authToken
    next()
  }
}

let networkInterface = addGraphQLSubscriptions(
  createNetworkInterface({
    uri: config.uri
  }),
  wsClient)

networkInterface.use([authTokenMiddleware])

const client = new ApolloClient({ networkInterface })

export { client as default, authToken }
