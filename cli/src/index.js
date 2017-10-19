import client from "./net_interface";
import { gql } from "react-apollo";
import 'isomorphic-fetch'

console.log('hello cli')

const GET_MESSAGES_QUERY = gql`query {
  messages
}`;

const ON_NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription onNewMessage {
      newMessage
  }
`;

const MUTATE_MESSAGE = gql`
  mutation AddMessage($message: String!) {
      addMessage(message: $message)
  }
`;

main()
function main() {
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

function subscribe() {
  return client.subscribe({
    query: ON_NEW_MESSAGE_SUBSCRIPTION
    // variables: { repoFullName: repoName },
  }).subscribe({
    next(data) { console.log('sub.data', data) },
    error(err) { console.error('sub.err', err); },
    complete() { console.log('sub.complete') },
  });
}
function query() {
  return client.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: GET_MESSAGES_QUERY
  }).then(result => {
    console.log('query.last', result.data.messages.slice(-1))
  })
}

function mutate() {
  return client.mutate({
    operationName: "AddMessage",
    mutation: MUTATE_MESSAGE,
    variables: { message: 'cli:' + new Date().toISOString() }
  }).then(result => {
    console.log('mutate', result.data)
  })

}
