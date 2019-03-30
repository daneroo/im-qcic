
import React from 'react'
import gql from 'graphql-tag'
import { df } from './df'
import { Subscription } from 'react-apollo'
import { RegisterApolloProvider } from './gql/RegisterApolloProvider'

const natsSubscription = gql`
subscription OnNewMessage {
  newMessage {
    id
    stamp
    host
    text
  }
}`

export default function NatsBridge ({ httpurl = 'https://api.qcic.n.imetrical.com/graphql' }) {
  let rows = []

  return <div>
    <span style={{ color: '#CCC' }} >nats/gql bridge => {httpurl}</span>
    <RegisterApolloProvider httpurl={httpurl}>
      <Subscription subscription={natsSubscription} >
        {({ data, loading, error }) => {
          // {!error && !loading && JSON.stringify(data)}
          if (loading) return <p>Loading...</p>
          if (error) return <p>Error :(</p>
          if (!data || !data.newMessage) return <p>---</p>

          const { id, stamp, host, text } = data.newMessage
          const row = [ id.slice(-5), df(stamp, 'HH:mm:ss'), host, text ]
          rows.push(row)
          rows = rows.slice(-4)
          return <Rows rows={rows} />
        }}
      </Subscription>
    </RegisterApolloProvider>
  </div>
}

function Rows ({ rows }) {
  return rows.map((row) => <pre key={row[0]} style={{ margin: '0px' }}>{row.join('  ')}  </pre>)
}
