
module.exports = {
  start
}

function start ({pubnub, channel, delay} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }

  let selfIdx = 1000
  setInterval(async () => {
    const payload = {
      // my: 'payload',
      idx: selfIdx++
    }
    try {
      const response = await send({pubnub, payload, channel})
      const sent = new Date(Math.ceil(+response.timetoken / 10000))
      const delay = +new Date() - sent
      const stamp = sent.toISOString()

      console.log('msg', payload, '@' + stamp, '>' + pubnub.getUUID(), 'Δ' + delay + 'ms')
    } catch (error) {
      console.log('error', error)
    }
  }, delay)
}

async function send ({pubnub, payload, channel}) {
  return pubnub.publish({
    message: payload,
    channel: channel
    // sendByPost: false, // true to send via post
    // storeInHistory: false // override default storage options
    // meta: {
    //   'cool': 'meta'
    // } // publish extra meta with the request
  })
}
