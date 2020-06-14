// For RegisterApolloProvider
import React from 'react'

import { ApolloProvider } from '@apollo/client'

import { useApolloClient } from './useApolloClient'

// Registers an ApolloClient, and wraps children in an <ApolloProvider />
export function RegisterApolloProvider ({ httpurl, children }) {
  const client = useApolloClient(httpurl)
  if (!client) {
    return <div />
  }
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
