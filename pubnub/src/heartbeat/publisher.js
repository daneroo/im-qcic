
// const {short} = require('./format')
const {short, deltaMs} = require('./format')

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
      await publish({pubnub, channel})
    } catch (error) {
      console.log('error', error)
    }
  }, delay)
}

async function publish ({pubnub, channel}) {
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
  // this is the latency between assign pubnub timetoken and received time
  // const pnstamp = fromTimeToken(response.timetoken)
  // const pndelay = deltaMs(pstamp, now)

  // this is the end-to end latency, from origin stamp, to received publish acknowledgment
  const now = new Date()
  const stamp = new Date(payload.stamp)
  const delay = deltaMs(stamp, now)

  console.log('→', short(pubnub.getUUID(), channel), payload, 'Δ=' + delay + 'ms')
}
