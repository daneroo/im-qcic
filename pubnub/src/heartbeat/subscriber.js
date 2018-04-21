
module.exports = {
  start
}

function start ({pubnub, channel, delay, quorum} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }
  const state = {} // last message received per publisher
  pubnub.addListener({
    status: showStatus,
    // message: showMessage
    message: monitorMessage(state)
  })
  pubnub.subscribe({
    channels: [channel]
  })

  setInterval(() => {
    checkExpired(state, delay * 2, quorum)
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

function checkExpired (state, maxDelay, quorum) {
  let present = 0
  for (const publisher in state) {
    const message = state[publisher]
    const {stamp, delay} = fromTimeToken(message.timetoken)
    if (delay > maxDelay) {
      console.log('missing publisher', publisher, 'since', stamp.toISOString())
      delete state[publisher]
    } else {
      present++
    }
  }
  if (present < quorum) {
    console.log('quorum not satisfied', {quorum, present})
  }
}

function showMessage (message) {
  const {stamp, delay} = fromTimeToken(message.timetoken)
  console.log('msg', message.message, '@' + stamp.toISOString(), '<' + message.publisher, 'Δ' + delay + 'ms')
}

function showStatus (statusEvent) {
  if (statusEvent.category === 'PNConnectedCategory') {
    console.log('connected')
  }
}

function fromTimeToken (timetoken) {
  const stamp = new Date(Math.ceil(+timetoken / 10000))
  const delay = +new Date() - stamp
  return {stamp, delay}
}
