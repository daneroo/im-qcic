const os = require('os')
// For now the ws baseURI is derived from BASEURI
// BASEURI Has to be explicit, until we fix the server
const BASEURI = process.env['BASEURI'] || 'http://localhost:5000'
const WSBASEURI = process.env['WSBASEURI'] || BASEURI.replace(/^http/, 'ws')

// export default {
module.exports = {
  uri: `${BASEURI}/graphql`,      // for http(s)://
  wsuri: `${WSBASEURI}/subscriptions`, // for ws://
  hostname: os.hostname()
}

console.log('Config:', JSON.stringify(module.exports, null, 2))
