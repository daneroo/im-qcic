
const alarm = require('../alarm')
const {short, fromTimeToken, deltaMs} = require('./format')

module.exports = {
  start
}

// TODO(daneroo): make this into a class, and bind in call or in constructor
// constructor() {
//   this.onClick = this.onClick.bind(this);
// }

// TODO(daneroo) if we wish to stop, we need to remove listeners, unsubscribe, and clearInterval
function start ({pubnub, channel, delay, quorum} = {}) {
  if (!pubnub) {
    console.error('Missing PubNuB instance')
    return
  }

  const maxDelay = delay * 2 + 1000

  // shared between accumulateMessageState and checkState
  // lastSeen:  stamp (for any publisher)
  // publishers: publisher -> message (last received per publisher)
  const state = {
    lastSeen: '1970-01-01T00:00:00Z',
    publishers: {}
  }

  pubnub.addListener({
    status: showConnectedStatus,
    message: accumulateMessageState(pubnub, channel, state)
  })
  pubnub.subscribe({
    channels: [channel]
  })

  setInterval(() => {
    checkState(state, channel, maxDelay, quorum)
  }, delay)
}

// binds context into handler closure, returns handler
function accumulateMessageState (pubnub, channel, state) {
  return (message) => {
    const publishers = state.publishers
    if (!publishers[message.publisher]) {
      console.log('+', short(message.publisher, message.channel), 'new publisher')
    }

    // store message in state
    publishers[message.publisher] = message

    // update lastSeen from message.stamp
    // TODO(daneroo): should it be message.timetoken ?
    if (message.message.stamp > state.lastSeen) {
      // console.log('  ...', short(message.publisher, message.channel), {lastSeen: state.lastSeen, message})
      state.lastSeen = message.message.stamp
    }

    // log it
    logReceived(pubnub, message)
  }
}

// maxDelay should allow for missing 1 or 2 messages plus the variability in message delivery,
//  plus the offset between the receive and checkState loops
function checkState (state, channel, maxDelay, quorum) {
  let present = 0
  const publishers = state.publishers

  for (const publisher in publishers) {
    const message = publishers[publisher]

    const stamp = fromTimeToken(message.timetoken)
    const delay = deltaMs(stamp, new Date())
    // console.log('  ...', short(message.publisher, message.channel), 'Δ' + delay + 'ms')
    if (delay > maxDelay) {
      console.log('-', short(message.publisher, message.channel), 'lost publisher', '@' + stamp.toISOString())
      delete publishers[publisher]
    } else {
      present++
    }
  }

  // trigger/resolve alarm
  const stamp = new Date().toISOString()
  const alrm = {id: channel + '.quorum', quorum, present, lastSeen: state.lastSeen, stamp}
  if (present < quorum) {
    alarm.trigger(alrm)
  } else {
    alarm.resolve(alrm)
  }
}

// print a short summary of received message
function logReceived (pubnub, message) {
  // this is the latency between assign pubnub timetoken and received time
  // const pstamp = fromTimeToken(message.timetoken)
  // const pdelay = deltaMs(pstamp, now)

  // this is the end-to end latency, from origin stamp, and receiving time
  // this is only meaningful if origin stamp and receiver are on the same clock
  const now = new Date()
  const stamp = new Date(message.message.stamp)
  const delay = deltaMs(stamp, now)
  const indicator = (message.publisher === pubnub.getUUID()) ? '=' : '~'

  console.log('←', short(message.publisher, message.channel), message.message, 'Δ' + indicator + delay + 'ms')
}

// Pubnub Connected status
function showConnectedStatus (statusEvent) {
  if (statusEvent.category === 'PNConnectedCategory') {
    console.log('connected')
  }
}
