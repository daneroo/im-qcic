
module.exports = {
  start
}

function start ({pubnub, channel, delay} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }

  setInterval(async () => {
    try {
      await send({pubnub, channel})
    } catch (error) {
      console.log('error', error)
    }
  }, delay)
}

async function send ({pubnub, channel}) {
  const payload = {
    stamp: new Date().toISOString()
  }

  const response = await pubnub.publish({
    message: payload,
    channel: channel
  })

  logSent(pubnub, channel, payload, response)
  return response
}

function logSent (pubnub, channel, payload, response) {
  const pstamp = new Date(Math.ceil(+response.timetoken / 10000))
  // const delay = +new Date() - sent
  const ostamp = new Date(payload.stamp)
  console.log([ostamp, pstamp, new Date()].map(d => d.toISOString()))

  const pdelay = +new Date() - pstamp
  const odelay = +new Date() - ostamp

  // , 'Δ' + delay + 'ms'
  console.log('→', pubnub.getUUID(), channel, payload, 'Δp' + pdelay + 'ms', 'Δo' + odelay + 'ms')
}
