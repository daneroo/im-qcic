// Shared configurations
const os = require('os')
const fs = require('fs')

const hostname = process.env.HOSTALIAS || os.hostname()

module.exports = {
  hostname,
  version: { // also exposed as API /version
    name: require('../package').name,
    version: require('../package').version,
    node: process.version
  },
  fastify: {
    port: process.env.PORT || 8001
  },
  loggly: getConfig('credentials.loggly.json', null),
  mysql: getConfig('credentials.mysql.json', null)
}

// used for loggly/mysql credentials
function getConfig (path, defaultValue) {
  try {
    // fs.accessSync(path, fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(path).toString())
  } catch (err) {
    console.warn('getConfig', err.message)
    return defaultValue
  }
}
