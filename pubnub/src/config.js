const os = require('os')
const fs = require('fs')

// export default {
module.exports = {
  hostname: process.env.HOSTNAME || os.hostname(),
  version: { // also exposed as API /version
    'pubnub-qcic': require('../package').version,
    node: process.versions.node
  },
  credentials: getConfig('credentials.saas.json', {
    pubnub: {
      publishKey: 'put-your-pub-here',
      subscribeKey: 'put-your-sub-here'
    },
    s3db: {
      // name: 'aws-s3',
      // region: 'us-west-2',
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'you-secret-access-key'
    },
    slack: {
      // Incoming WebHooks : Posts to #qcic as qcicbot
      inhook: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      // Slack API Tester - old token from https://api.slack.com/custom-integrations/legacy-tokens
      token: 'xoxp-xxxxxxxxxxx-xxxxxxxxxxx-xxxxxxxxxxx-xxxxxxxxxx'
    }
  }),
  s3db: {
    name: 'qcic',
    // namePattern: '${db.name}.${db.environment}-${name}' // default
    environment: 'production' // default is dev. TODO(daneroo): should respect NODE_ENV?
  }
}

// used for SaaS credentials
function getConfig (path, defaultValue) {
  try {
    // fs.accessSync(path, fs.constants.R_OK)
    return JSON.parse(fs.readFileSync(path).toString())
  } catch (err) {
    console.warn('getConfig', err.message)
    return defaultValue
  }
}
