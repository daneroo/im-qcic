// Shared configurations
const os = require('os')

const hostname = process.env.HOSTALIAS || os.hostname()

module.exports = {
  hostname,
  version: {
    // also exposed as API /version
    name: require('../package').name,
    version: require('../package').version,
    node: process.version
  },
  fastify: {
    port: process.env.PORT || 8002
  }
}
