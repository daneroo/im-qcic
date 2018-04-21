
module.exports = {
  start
}

function start ({pubnub, channel = 'www', delay = 2000} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }

  let selfIdx = 1000
  setInterval(() => {
    const payload = {
      // my: 'payload',
      idx: selfIdx++
    }
    pubnub.publish({
      message: payload,
      channel: channel
      // sendByPost: false, // true to send via post
      // storeInHistory: false // override default storage options
      // meta: {
      //   'cool': 'meta'
      // } // publish extra meta with the request
    }, function (status, response) {
      if (status.error) {
        // handle error
        console.log('error', status)
      } else {
        console.log('message Published w/ timetoken', response.timetoken)
      }
    })
  }, delay)
}
