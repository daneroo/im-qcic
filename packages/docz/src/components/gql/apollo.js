import ApolloClient from 'apollo-client'
import { WebSocketLink } from 'apollo-link-ws'
import { HttpLink } from 'apollo-link-http'
import { ApolloLink, split } from 'apollo-link'
import { onError } from 'apollo-link-error'
import { getMainDefinition } from 'apollo-utilities'
import { InMemoryCache } from 'apollo-cache-inmemory'

// If I kept a reference to wsLink, I could invoke this close method
// wsLink.subscriptionClient.close(false, false);

// In the Hasura demo apps, the graphql endpoints are behind a Caddy proxy
// Where we can use the folowwing as a default for httpurl
// const httpurl = `${window.location.protocol}://${window.location.host}/v1alpha1/graphql`

const newApolloClient = (httpurl, wsurl = httpurl.replace(/^http/, 'ws')) => {
  // Create an http link:
  const httpLink = new HttpLink({
    uri: httpurl
    // headers: getHeadersFromAuthConextIfWeHaveAuth0()
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
  return client
}

export default newApolloClient
