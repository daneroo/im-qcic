'use strict'

const os = require('os')

const PORT = 5000
const hostname = process.env.HOSTALIAS || os.hostname()
const topic = 'im.qcic.heartbeat'

// export default {
module.exports = {
  hostname,
  version: { // also exposed as API /version
    name: require('../package').name,
    app: require('../package').version,
    node: process.version
  },
  express: {
    port: PORT
  },
  nats: {
    servers: [process.env.NATSURL || 'nats://dirac.imetrical.com:4222'],
    topic // used as a single topic/subject for pub and sub, may turn into a base/prefix
  }
}

console.log('Config:', JSON.stringify(module.exports, null, 2))
