const http = require('http')
const express = require('express')
const cors = require('cors')
const { ApolloServer } = require('apollo-server-express')
const { typeDefs, resolvers } = require('./schema')
const {
  PORT,
  BASEURI,
  WSBASEURI // not used (yet)
} = require('./config')

const app = express()
app.use('*', cors())
app.get('/', function (req, res) {
  res.json({ you: 'Home', status: 'OK', stamp: new Date().toISOString() })
})
app.get('/health', function (req, res) {
  const stamp = new Date().toISOString()
  // const randomFailure = Math.random() > 0.95
  const minute = new Date().getMinutes()
  const hour = new Date().getHours()
  const randomFailure = (minute < 20) && (hour === 0)
  // chose 503, 4xx are client errors, and 503 is implicitly temporary
  console.log({stamp, randomFailure})
  if (randomFailure) {
    res.status(503).json({ error: 'randomly not healthy', status: 'ERROR', stamp })
  } else {
    res.json({ status: 'OK', stamp })
  }
})

const server = new ApolloServer({
  // These will be defined for both new or existing servers
  typeDefs,
  resolvers
})

server.applyMiddleware({ app }) // app is from an existing express app

const httpServer = http.createServer(app)
server.installSubscriptionHandlers(httpServer)

httpServer.listen({ port: PORT }, () => {
  console.log(`QCIC Graphql Server ready at ${BASEURI}:${PORT}${server.graphqlPath}`)
  console.log(`QCIC Subscriptions  ready at ${WSBASEURI}:${PORT}${server.subscriptionsPath}`)
})
