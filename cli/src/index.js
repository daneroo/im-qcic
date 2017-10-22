require('isomorphic-fetch')
const {
  // GET_MESSAGES_QUERY,
  MUTATE_MESSAGE, ON_NEW_MESSAGE_SUBSCRIPTION
} = require('./queries')
const client = require('./net_interface')
// const config = require('./config')

main()
function main () {
  setInterval(() => {
    console.log('subscribing')
    const subscriptionObserver = subscribe()
    setTimeout(() => {
      console.log('unsubscribing')
      subscriptionObserver.unsubscribe()
    }, 10000)
  }, 20000)

  setInterval(() => {
    Promise.resolve()
      // .then(query)
      .then(mutate)
    // .then(query)
  }, 2000)
}

const myId = Math.random().toFixed(5).slice(2)
function newMessage () {
  return {
    stamp: new Date().toISOString(),
    host: myId, // config.hostname,
    text: 'ping'
  }
}
function subscribe () {
  return client.subscribe({
    query: ON_NEW_MESSAGE_SUBSCRIPTION
    // variables: { repoFullName: repoName },
  }).subscribe({
    next (data) {
      const m = data.newMessage
      const delta = +new Date() - new Date(m.stamp)
      console.log('sub.data', m.id, m.host, m.stamp, m.text, ' Δ ' + delta + ' ms')
    },
    error (err) { console.error('sub.err', err) },
    complete () { console.log('sub.complete') }
  })
}

// function query () {
//   return client.query({
//     fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
//     query: GET_MESSAGES_QUERY
//   }).then(result => {
//     console.log('query.last', result.data.messages.slice(-1))
//   })
// }

function mutate () {
  return client.mutate({
    operationName: 'AddMessage',
    mutation: MUTATE_MESSAGE,
    variables: newMessage()
  }).then(result => {
    console.log('mutate', result.data.addMessage.id)
  })
}
