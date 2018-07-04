const express = require('express')
const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { createServer } = require('http')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const cors = require('cors')
const { schema } = require('./schema')

const {
  PORT,
  // BASEURI, // not used
  WSBASEURI
} = require('./config')

const app = express()
app.use('*', cors())
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: `${WSBASEURI}/subscriptions`
}))

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
  console.log({randomFailure})
  if (randomFailure) {
    res.status(503).json({ error: 'randomly not healthy', status: 'ERROR', stamp })
  } else {
    res.json({ status: 'OK', stamp })
  }
})

const server = createServer(app)
server.listen(PORT, () => {
  new SubscriptionServer({ // eslint-disable-line no-new
    execute,
    subscribe,
    schema
  }, {
    server: server,
    path: '/subscriptions'
  })
})
