const os = require('os')

const nats = require('nats').connect({
  maxReconnectAttempts: -1,
  reconnectTimeWait: 1000 // 250
})

const interval = 10000
setupHandlers(nats)

const subject = 'qcic'

nats.subscribe(subject, function (msg, reply, subject) {
  console.log(`<<[${subject}]: ${msg}`)
})

const hostname = process.env.HOSTNAME || os.hostname()
const clientId = Math.round(1000 + Math.random() * 1000)

setInterval(() => {
  // TOTO(daneroo): new shape of heartbeat message
  // const msg = {
  //   stamp: new Date().toISOString(),
  //   host: hostname,
  //   clientId
  // }
  const msg = `heartbeat from ${hostname}-${clientId} @${new Date().toISOString()}`
  nats.publish(subject, msg, function () {
    console.log(`>>[${subject}]: ${msg}`)
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
