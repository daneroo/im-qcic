
import { useState, useEffect } from 'react'

import { ApolloClient, split, HttpLink, InMemoryCache } from '@apollo/client'
import { getMainDefinition } from '@apollo/client/utilities'
import { WebSocketLink } from '@apollo/link-ws'

export function useApolloClient (httpurl) {
  const [client, setClient] = useState(null)
  useEffect(() => {
    setClient(registerApolloClient(httpurl))
    return () => {
      // this is where I would unregister/close the client
    }
  }, [httpurl])
  return client
}

// registry:  acts as a global registry, so we can create multiple Providers using the same client
const registry = {} // map httpurl => client

// memoize calls to newApolloClient(httpurl)
export function registerApolloClient (httpurl) {
  if (httpurl in registry) {
    console.log('ReUse ApolloClient', { httpurl })
    return registry[httpurl]
  }
  console.log('New ApolloClient', { httpurl })
  const client = newApolloClient(httpurl)
  registry[httpurl] = client
  return client
}

// This is the meat of the ApolloClient Constructor
export function newApolloClient (httpurl, wsurl = httpurl.replace(/^http/, 'ws')) {
  // Create an http link:
  const httpLink = new HttpLink({
    uri: httpurl
    // headers: getHeadersFromAuthContextIfWeHaveAuth0()
  })

  // Create a websocket link:
  // We can also instantiate this with a new WebSocketLink(new SubscriptionClient(uri,opts))
  const wsLink = new WebSocketLink({
    uri: wsurl,
    options: {
      reconnect: true
    }
  })

  const link = split(
    ({ query }) => {
      const { kind, operation } = getMainDefinition(query)
      return kind === 'OperationDefinition' && operation === 'subscription'
    },
    wsLink,
    httpLink
  )

  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link
  })
  return client
}

// Removed the errorLink  handler and client.close()
// const onLinkError = ({ graphQLErrors, networkError }) => {
//   if (graphQLErrors) {
//     graphQLErrors.map(({ message, locations, path }) =>
//       console.error(
//         `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
//       )
//     )
//   }
//   if (networkError) console.error(`[Network error]: ${networkError}`)
// }
// const client = new ApolloClient({
//   // link, // could just return the link = split()
//   link: from([
//     onError(onLinkError),
//     link
//   ]),
//   cache: new InMemoryCache()
// })
// client.close = (isForced = true, closedByUser = true) => {
//   // Check the behavior of (isForced,closedByUser), and when we'd wan to
//   console.log('ApolloClient::Cleanup (advisory)', { wsLink })
//   // wsLink.subscriptionClient.close(false, false)
//   // wsLink.subscriptionClient.close(true, true)
// }

// // Not sure when we should call this..
// // But it does actually close the connection to the server (confirmed on server)
// export function closeAll (isForced = true, closedByUser = true) {
//   const httpurls = Object.keys(registry)
//   for (const httpurl of httpurls) {
//     console.log('Closing', { httpurl })
//     registry[httpurl].close(isForced, closedByUser)
//     delete registry[httpurl]
//   }
// }
