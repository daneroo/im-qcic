const os = require('os')

const nats = require('nats').connect({
  maxReconnectAttempts: -1,
  reconnectTimeWait: 1000 // 250
})

const interval = 3000
setupHandlers(nats)

const topic = 'im.test.heartbeat'
const hostname = process.env.HOSTNAME || os.hostname()
const clientId = Math.round(1000 + Math.random() * 1000)

nats.subscribe(topic, function (msg, reply, subject) {
  console.log(`<<[${subject}]: ${msg}`)
})

setInterval(() => {
  const msg = {
    stamp: new Date().toISOString(),
    host: [hostname, clientId].join('-'),
    text: clientId
  }
  const payload = JSON.stringify(msg)
  nats.publish(topic, payload, function () {
    console.log(`>>[${topic}]: ${payload}`)
  })
}, interval)

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
