// For RegisterApolloProvider
import React, { useState, useEffect } from 'react'

import { ApolloProvider } from 'react-apollo'
import { registerApolloClient } from './apollo-client-setup'

// Registers an ApolloClient, and wraps children in an <ApolloProvider />
// could do things like client.cleaup(), with useEffect
export function RegisterApolloProvider ({ httpurl, children }) {
  const [client, setClient] = useState(null)
  useEffect(() => {
    setClient(registerApolloClient(httpurl))
  }, [httpurl])
  if (!client) {
    return <div />
  }
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
