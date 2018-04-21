
const PubNub = require('pubnub')
const config = require('../config')
const publisher = require('./publisher')
const subscriber = require('./subscriber')

const channel = 'wwww.hb'
module.exports = {
  publish,
  watch
}

function publish () {
  publisher.start({pubnub: newPubNub(), channel})
}
function watch () {
  subscriber.start({pubnub: newPubNub(), channel})
}

function newPubNub () {
  return new PubNub({
    subscribeKey: config.pubnub.keys.subscribe,
    publishKey: config.pubnub.keys.publish,
    uuid: PubNub.generateUUID(),
    ssl: true
  })
}
