
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
      idx: selfIdx++,
      stamp: new Date().toISOString()
    }
    try {
      const response = await send({pubnub, payload, channel})
      const sent = new Date(Math.ceil(+response.timetoken / 10000))
      // const delay = +new Date() - sent
      const stamp = sent.toISOString()

      // , 'Δ' + delay + 'ms'
      console.log('msg', payload, '@' + stamp, '>' + pubnub.getUUID())
    } catch (error) {
      console.log('error', error)
    }
  }, delay)
}

async function send ({pubnub, payload, channel}) {
  return pubnub.publish({
    message: payload,
    channel: channel
  })
}
