
import React from 'react'
// import gql from 'graphql-tag'
// import { df } from './df'
// import { Subscription } from 'react-apollo'
// import { RegisterApolloProvider } from './gql/RegisterApolloProvider'
import { Greeter, Welcome, Wilkomen } from '@daneroo/qcic-apollo-client-setup'

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
    <h4>Greeter: {Greeter('Dan-da-man')}</h4>
    <Welcome />
    <Wilkomen />
  </div>
}
