import ApolloClient from 'apollo-client'
import { WebSocketLink } from 'apollo-link-ws'
import { HttpLink } from 'apollo-link-http'
import { ApolloLink, split } from 'apollo-link'
import { onError } from 'apollo-link-error'
import { getMainDefinition } from 'apollo-utilities'
import { InMemoryCache } from 'apollo-cache-inmemory'

const registry = {} // map httpurl => client

// acts as a global registry, so we can create multiple Providers using the same client
export function registerApolloClient (httpurl) {
  if (httpurl in registry) {
    console.log('ReUse ApolloCLient', { httpurl })
    return registry[httpurl]
  }
  console.log('New ApolloCLient', { httpurl })
  const client = newApolloClient(httpurl)
  registry[httpurl] = client
  return client
}

// Not sure when we should call this..
// But it does actually close the connection to the server (confirmed on server)
export function closeAll (isForced = true, closedByUser = true) {
  const httpurls = Object.keys(registry)
  for (const httpurl of httpurls) {
    console.log('Closing', { httpurl })
    registry[httpurl].close(isForced, closedByUser)
    delete registry[httpurl]
  }
}

// If I kept a reference to wsLink, I could invoke this close method
// wsLink.subscriptionClient.close(false, false);
// The client also exposes a cleanup method (advisory for now): client.cleanup()

// In the Hasura demo apps, the graphql endpoints are behind a Caddy proxy
// Where we can use the following as a default for httpurl
// const httpurl = `${window.location.protocol}://${window.location.host}/v1alpha1/graphql`

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
  // split based on operation type
    ({ query }) => {
      const { kind, operation } = getMainDefinition(query)
      return kind === 'OperationDefinition' && operation === 'subscription'
    },
    wsLink,
    httpLink
  )

  // error handler
  const onLinkError = ({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.map(({ message, locations, path }) =>
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        )
      )
    }
    if (networkError) console.error(`[Network error]: ${networkError}`)
  }
  const client = new ApolloClient({
    // link, // could just return the link = split()
    link: ApolloLink.from([
      onError(onLinkError),
      link
    ]),
    cache: new InMemoryCache()
  })
  client.close = (isForced = true, closedByUser = true) => {
    // Check the behavior of (isForced,closedByUser), and when we'd wan to
    console.log('AppolloClient::Cleanup (advisory)', { wsLink })
    // wsLink.subscriptionClient.close(false, false)
    // wsLink.subscriptionClient.close(true, true)
  }
  return client
}
