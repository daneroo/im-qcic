import client from './net_interface'
import 'isomorphic-fetch'
import { GET_MESSAGES_QUERY, MUTATE_MESSAGE, ON_NEW_MESSAGE_SUBSCRIPTION } from './queries'

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
      .then(query)
  }, 2000)
}

const myId = Math.random().toFixed(5).slice(2)
function newMessage () {
  return ['cli', myId, new Date().toISOString()].join(':')
}
function subscribe () {
  return client.subscribe({
    query: ON_NEW_MESSAGE_SUBSCRIPTION
    // variables: { repoFullName: repoName },
  }).subscribe({
    next (data) { console.log('sub.data', data) },
    error (err) { console.error('sub.err', err) },
    complete () { console.log('sub.complete') }
  })
}
function query () {
  return client.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: GET_MESSAGES_QUERY
  }).then(result => {
    console.log('query.last', result.data.messages.slice(-1))
  })
}

function mutate () {
  return client.mutate({
    operationName: 'AddMessage',
    mutation: MUTATE_MESSAGE,
    variables: { message: newMessage() }
  }).then(result => {
    console.log('mutate', result.data)
  })
}
