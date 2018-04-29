
const PubNub = require('pubnub')
const config = require('../config')
const publisher = require('./publisher')
const watcher = require('./watcher')

const channel = 'qcic.heartbeat'
const delay = 10000 // default publish interval
const quorum = 1

module.exports = {
  publish,
  watch
}

// re-use same pubnub client for publish and watch,
// to determine if origin clock can be used reliably for latency calculation (watcher)
const pubnub = newPubNub()

function publish () {
  publisher.start({pubnub, channel, delay})
}

function watch () {
  watcher.start({pubnub, channel, delay, quorum})
}

function newPubNub () {
  return new PubNub({
    ...config.credentials.pubnub,
    uuid: PubNub.generateUUID(),
    ssl: true
  })
}
