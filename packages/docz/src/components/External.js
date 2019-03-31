
import React from 'react'
// import gql from 'graphql-tag'
// import { df } from './df'
// import { Subscription } from 'react-apollo'
// import { RegisterApolloProvider } from './gql/RegisterApolloProvider'
import { Greeter, Welcome } from '@daneroo/pika-lib-simple'

// const natsSubscription = gql`
// subscription OnNewMessage {
//   newMessage {
//     id
//     stamp
//     host
//     text
//   }
// }`

export default function External () {
  return <div>
    <h4>Greeter: {Greeter('IUHASD')}</h4>
    <Welcome />
  </div>
}

function Rows ({ rows }) {
  return rows.map((row) => <pre key={row[0]} style={{ margin: '0px' }}>{row.join('  ')}  </pre>)
}
