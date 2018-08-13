// const ulid = require('ulid').ulid
const config = require('./config')

module.exports = { start }

const interval = 10000

// start the interval timer, with the nats publisher function
function start (publish) {
  return setInterval(() => {
    const message = {
      // id: ulid(),
      stamp: new Date().toISOString(),
      host: config.hostname,
      text: 'watching'
    }
    publish(message)
  }, interval)
}
