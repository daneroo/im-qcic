'use strict'

const WebSocket = require('ws')
// const { ApolloLink } = require('apollo-link')
// const { HttpLink } from 'apollo-link-http';
const { WebSocketLink } = require('apollo-link-ws')
const { SubscriptionClient } = require('subscriptions-transport-ws')
const { ApolloClient } = require('apollo-client')
const { InMemoryCache } = require('apollo-cache-inmemory')

const config = require('./config')

// const authToken = Math.floor((Math.random() * 100000000) + 1)

const client = new SubscriptionClient(config.wsuri, {
  reconnect: true
  // connectionParams: {
  //   authToken: authToken
  // }
}, WebSocket)

const link = new WebSocketLink(client)

const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache()
})

module.exports = apolloClient
