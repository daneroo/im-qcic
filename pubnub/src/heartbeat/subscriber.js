
module.exports = {
  start
}

function start ({pubnub, channel = 'www'} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }

  pubnub.addListener({
    status: function (statusEvent) {
      console.log('status', statusEvent)
      // if (statusEvent.category === 'PNConnectedCategory') {
      //   console.log('connected')
      // }
    },
    message: function (message) {
      console.log('msg', message.message, message.timetoken, message.publisher)
    }
    // presence: function (presenceEvent) {
    //   console.log('presence', presenceEvent)
    // }
  })
  pubnub.subscribe({
    channels: [channel]
    // withPresence: true
  })
}
