import React, { useState } from 'react'
import { useApolloClient } from '@daneroo/qcic-gql-client'
import { gql, useQuery, useSubscription, ApolloProvider } from '@apollo/client'
import { Messages } from './Messages'

const msgQy = gql`
  query GetMessages {
    messages {
      id
      stamp
      text
    }
}`

const msgSub = gql`
subscription OnNewMessage {
  newMessage {
    id
    stamp
    text
  }
}`

export const defaultHttpurl = 'https://fizzbuzzclock.n.imetrical.com/graphql'

export function MessagesSub ({ maxRows = 0 }) {
  const [messages, setMessages] = useState([])
  const { loading, error, data } = useSubscription(msgSub, {
    onSubscriptionData: ({ /* client, */ subscriptionData }) => {
      if (subscriptionData && subscriptionData.data && subscriptionData.data.newMessage) {
        setMessages([...messages, subscriptionData.data.newMessage].slice(-maxRows))
      }
    }
  })

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error {error.message}</p>
  if (!data || !data.newMessage) return <p>---</p>

  return <Messages messages={messages} maxRows={maxRows} />
}

export function MessagesQyPoll ({ httpurl = defaultHttpurl, pollInterval = 0, maxRows = 0 }) {
  const [isPolling, setPolling] = useState(true)
  const toggle = () => setPolling(!isPolling)

  const client = useApolloClient(httpurl)
  if (!client) {
    return <div />
  }

  return (
    <div>
      <div>
        <button onClick={() => toggle()}>{(isPolling) ? 'Stop' : 'Start'}</button>
        <span style={{ marginLeft: '1em' }}>
          {(isPolling) ? `pollInterval: ${pollInterval}ms` : 'not polling'}
        </span>

      </div>
      <ApolloProvider client={client}>
        <MessagesQyInternal pollInterval={isPolling ? pollInterval : 0} maxRows={maxRows} />
      </ApolloProvider>
    </div>
  )
}

function MessagesQyInternal ({ pollInterval = 0, maxRows = 0 }) {
  const { loading, error, data } = useQuery(msgQy, {
    pollInterval
  })

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error {error.message}</p>
  if (!data || !data.messages) return <p>---</p>

  return <Messages messages={data.messages} maxRows={maxRows} />
}
