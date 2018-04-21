
const PubNub = require('pubnub')
const config = require('../config')
const publisher = require('./publisher')
const subscriber = require('./subscriber')

const channel = 'wwww.hb'
const delay = 3000 // default publish interval
module.exports = {
  publish,
  watch
}

function publish () {
  publisher.start({pubnub: newPubNub(), channel, delay})
}
function watch () {
  subscriber.start({pubnub: newPubNub(), channel, delay})
}

function newPubNub () {
  return new PubNub({
    ...config.credentials.pubnub,
    uuid: PubNub.generateUUID(),
    ssl: true
  })
}
