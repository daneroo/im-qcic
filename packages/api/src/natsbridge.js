
const ulid = require('ulid').ulid
const config = require('./config')

// both publish and subscribe single topic
const { topic } = config.nats

const nats = require('nats').connect({
  // json:true,
  servers: config.nats.servers,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 1000 // 250
})

module.exports = { start, publishToNats }

setupHandlers(nats)

// publishToGQL(message) is the callback handler when we receive a message from nats
function start (publishToGQL) {
  nats.subscribe(topic, function (payload, reply, subject) {
    console.log(`<<[${subject}]: ${payload}`)
    let message
    try {
      message = JSON.parse(payload)
    } catch (e) {
      message = { text: e, message }
    }
    publishToGQL({
      id: ulid(),
      text: '-',
      ...message
    })
  })
}

function publishToNats (message) {
  if (typeof message === 'object') {
    message = JSON.stringify(message)
  }
  // log after publish is acknowledged
  nats.publish(topic, message, function () {
    console.log(`>>[${topic}]: ${message}`)
  })
}

// TODO(daneroo): cleanup and common log
function setupHandlers (nats) {
  nats.on('error', function (e) {
    console.log('Error [' + nats.options.url + ']: ' + e)
  })

  nats.on('connect', function (nc) {
    console.log('connected')
  })

  nats.on('disconnect', function () {
    console.log('disconnect')
  })

  nats.on('reconnecting', function () {
    console.log('reconnecting')
  })

  nats.on('reconnect', function (nc) {
    console.log('reconnect')
  })

  nats.on('close', function () {
    console.log('close')
  })
}
