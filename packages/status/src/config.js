// Shared configrations
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
  loggly: getConfig('credentials.loggly.json', null)
}

// used for loggly credentials
function getConfig (path, defaultValue) {
  try {
    // fs.accessSync(path, fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(path).toString())
  } catch (err) {
    console.warn('getConfig', err.message)
    return defaultValue
  }
}
