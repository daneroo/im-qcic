
module.exports = {
  short,
  fromTimeToken,
  deltaMs
}

function short (publisher, channel) {
  return (publisher.substring(0, 8) + ':' + channel)
}

// return a date from a pubnub timetoken
function fromTimeToken (timetoken) {
  return new Date(Math.ceil(+timetoken / 10000))
}

// ms between two (ordered) dates
function deltaMs (from, to) {
  to = to || new Date()
  return +to - from
}
