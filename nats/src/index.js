
const nats = require('nats').connect({
  maxReconnectAttempts: -1,
  reconnectTimeWait: 1000 // 250
})

const interval = 3000
setupHandlers(nats)

const subject = 'qcic'

nats.subscribe(subject, function (msg) {
  console.log('Received "' + msg + '"')
})

setInterval(() => {
  const msg = 'qcic-' + new Date().toISOString()
  nats.publish(subject, msg, function () {
    console.log('Published [' + subject + '] : "' + msg + '"')
    //   process.exit()
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
