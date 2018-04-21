
module.exports = {
  start
}

function start ({pubnub, channel, delay} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }
  const state = {} // last message received
  pubnub.addListener({
    status: showStatus,
    // message: showMessage
    message: monitorMessage(state)
  })
  pubnub.subscribe({
    channels: [channel]
  })

  setInterval(() => {
    checkExpired(state, delay * 2)
  }, delay)
}

function monitorMessage (state) {
  return (message) => {
    showMessage(message)
    if (!state[message.publisher]) {
      console.log('new publisher', message.publisher)
    }
    state[message.publisher] = message
  }
}

function checkExpired (state, maxDelay) {
  // console.log('watch', state)
  for (const publisher in state) {
    const message = state[publisher]
    const {stamp, delay} = fromTimeToken(message.timetoken)
    // console.log('-watch', publisher, stamp, delay)
    if (delay > maxDelay) {
      console.log('missing publisher', publisher, 'since', stamp.toISOString())
      delete state[publisher]
    }
  }
}

function showMessage (message) {
  const {stamp, delay} = fromTimeToken(message.timetoken)
  console.log('msg', message.message, '@' + stamp.toISOString(), '<' + message.publisher, 'Δ' + delay + 'ms')
}

function showStatus (statusEvent) {
  // console.log('status', statusEvent)
  if (statusEvent.category === 'PNConnectedCategory') {
    console.log('connected')
  }
}

function fromTimeToken (timetoken) {
  const stamp = new Date(Math.ceil(+timetoken / 10000))
  const delay = +new Date() - stamp
  return {stamp, delay}
}
