import React from 'react'
import { gql, useQuery, ApolloProvider, ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { df } from './df'

const msgQy = gql`
  query GetMessages {
    messages {
      id
      stamp
      host
      text
    }
}`

export function Messages ({ pollInterval = 0, maxRows = 0 }) {
  // this should be a hook
  const client = registerApolloClient()
  return (
    <ApolloProvider client={client}>
      <MessagesInternal pollInterval={pollInterval} maxRows={maxRows} />
    </ApolloProvider>
  )
}

function MessagesInternal ({ pollInterval = 0, maxRows = 0 }) {
  const { loading, error, data } = useQuery(msgQy, {
    pollInterval
  })

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error {error.message}</p>
  if (!data || !data.messages) return <p>---</p>

  const rows = [
    ['id', 'stamp', 'host', 'text'],
    ...data.messages.map((msg) => {
      const { id, stamp, host, text } = msg
      const row = [id.slice(-5), df(stamp, 'HH:mm:ss'), host, text]
      return row
    }).slice(-maxRows)]

  const gridCSS = {
    display: 'grid',
    columnGap: '1em',
    gridTemplateColumns: 'repeat(3, auto) 1fr'
    // gridTemplateColumns: 'repeat(4, 1fr)'
    // gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))'
  }
  return (

    <div style={gridCSS}>
      <Rows rows={rows} />
    </div>
  )
}

function Rows ({ rows }) {
  return rows.map((row) => {
    const rk = row[0]
    return row.map((c, i) => (<span key={rk + '-' + i}>{c}</span>))
  })
}

const registry = {} // map httpurl => client

// acts as a global registry, so we can create multiple Providers using the same client
function registerApolloClient (httpurl = 'https://natsql.dl.imetrical.com/graphql') {
  if (httpurl in registry) {
    console.log('ReUse ApolloClient', { httpurl })
    return registry[httpurl]
  }
  console.log('New ApolloClient', { httpurl })
  const client = newApolloClient(httpurl)
  registry[httpurl] = client
  return client
}

function newApolloClient (httpurl, wsurl = httpurl.replace(/^http/, 'ws')) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: httpurl
    })
  })

  return client
}
