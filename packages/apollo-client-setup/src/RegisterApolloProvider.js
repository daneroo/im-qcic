// For RegisterApolloProvider
import React from 'react'
import { ApolloProvider } from 'react-apollo'
import { registerApolloClient } from './apollo-client-setup'

// Registers an ApolloClient, and wraps children in an <ApolloProvider />
// could do things like client.cleaup(), with useEffect
export function RegisterApolloProvider ({ httpurl, children }) {
  const client = registerApolloClient(httpurl)
  return <ApolloProvider client={client}>
    {children}
  </ApolloProvider>
}
