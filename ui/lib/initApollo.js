import { ApolloClient, createNetworkInterface } from 'react-apollo'
import { addGraphQLSubscriptions, SubscriptionClient } from "subscriptions-transport-ws";

import fetch from 'isomorphic-fetch'

let apolloClient = null

// Polyfill fetch() on the server (used by apollo-client)
if (!process.browser) {
  global.fetch = fetch
}

const BASEURI = 'http://localhost:5000'
// const BASEURI = 'https://gql-qcic.now.sh'
const WSBASEURI = BASEURI.replace(/^http/, 'ws')

const uri = `${BASEURI}/graphql`;
const wsuri = `${WSBASEURI}/subscriptions`;

function create(initialState) {
  let networkInterface = createNetworkInterface({
    uri: uri, // Server URL (must be absolute)
  })
  // No Subscriptions on server-side
  if (process.browser){
    const wsClient = new SubscriptionClient(wsuri, {
      reconnect: true,
    });
    networkInterface = addGraphQLSubscriptions(networkInterface, wsClient)    
  }

  return new ApolloClient({
    initialState,
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    networkInterface: networkInterface
  })
}

export default function initApollo(initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) {
    return create(initialState)
  }

  // Reuse client on the client-side
  if (!apolloClient) {
    apolloClient = create(initialState)
  }

  return apolloClient
}
