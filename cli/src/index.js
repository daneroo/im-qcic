require('isomorphic-fetch') // should I use node-fetch?
const {decodeTime} = require('ulid')

const {
  GET_MESSAGES_QUERY,
  MUTATE_MESSAGE,
  ON_NEW_MESSAGE_SUBSCRIPTION
} = require('./queries')

const client = require('./net_interface')

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

  query()
  setInterval(async () => {
    await mutate()
    // await query()
  }, 2000)
}

const myId = 'h-' + Math.random().toFixed(5).slice(2) // 0.12345
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
  }).subscribe({
    next (data) {
      const m = data.data.newMessage

      const delta = +new Date() - new Date(m.stamp)
      const serverStamp = decodeTime(m.id)
      const deltaServer = +new Date() - new Date(serverStamp)
      const augmented = { ...m, Δ: delta, Δsrv: deltaServer }
      delete augmented.__typename
      console.log('sub.data', JSON.stringify(augmented))
    },
    error (err) { console.error('sub.err', err) },
    complete () { console.log('sub.complete') }
  })
}

function query () {
  return client.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: GET_MESSAGES_QUERY
  }).then(result => {
    const msgs = result.data.messages
    let last = msgs.length > 0 ? msgs.slice(-1)[0] : {}
    last = {...last} // can't delete if I don;t clone
    delete last.__typename
    console.log('query.last', JSON.stringify(last))
  })
}

function mutate () {
  return client.mutate({
    operationName: 'AddMessage',
    mutation: MUTATE_MESSAGE,
    variables: newMessage()
  }).then(result => {
    console.log('mutate', result.data.addMessage.id)
  })
}
