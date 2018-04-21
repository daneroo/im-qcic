const os = require('os')

// export default {
module.exports = {
  hostname: process.env.HOSTNAME || os.hostname(),
  version: { // also exposed as API /version
    'pubnub-qcic': require('../package').version,
    node: process.versions.node
  },
  pubnub: {
    keys: {
      publish: 'pub-c-f438cd3e-2525-461c-a956-63483b41b6d8',
      subscribe: 'sub-c-ab4da160-39be-11e8-8bb7-3ab51ec5ed79'
    }
  }
}
