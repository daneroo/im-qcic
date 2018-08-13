const http = require('http')
const express = require('express')
const cors = require('cors')
const { ApolloServer } = require('apollo-server-express')

const schema = require('./schema')
const heartbeat = require('./heartbeat')
const natsbridge = require('./natsbridge')
const config = require('./config')

const { port } = config.express

schema.setNatsPublish(natsbridge.publishToNats)
heartbeat.start(natsbridge.publishToNats)
natsbridge.start(schema.publishToGQL)

const app = express()
app.use('*', cors())
app.get('/', function (req, res) {
  res.json({ you: 'Home', status: 'OK', stamp: new Date().toISOString() })
})
app.get('/version', function (req, res) {
  res.json(config.version)
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
  typeDefs: schema.typeDefs,
  resolvers: schema.resolvers

})

server.applyMiddleware({ app }) // app is from an existing express app

const httpServer = http.createServer(app)
server.installSubscriptionHandlers(httpServer)

httpServer.listen({ port }, () => {
  console.log(`QCIC Graphql Server ready at http://0.0.0.0:${port}${server.graphqlPath}`)
  console.log(`QCIC Subscriptions  ready at ws://:${port}${server.subscriptionsPath}`)
})
