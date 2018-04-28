
const PubNub = require('pubnub')
const config = require('../config')
const publisher = require('./publisher')
const watcher = require('./watcher')

const channel = 'wwww.hb'
const delay = 10000 // default publish interval
const quorum = 1
module.exports = {
  publish,
  watch
}

function publish () {
  publisher.start({pubnub: newPubNub(), channel, delay})
}

function watch () {
  watcher.start({pubnub: newPubNub(), channel, delay, quorum})
}

function newPubNub () {
  return new PubNub({
    ...config.credentials.pubnub,
    uuid: PubNub.generateUUID(),
    ssl: true
  })
}
