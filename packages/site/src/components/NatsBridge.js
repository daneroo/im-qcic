/** @jsx jsx */
import { jsx } from 'theme-ui'
import { useState } from 'react'
import { gql, useSubscription } from '@apollo/client'
import { df } from './df'

const msgSub = gql`
subscription OnNewMessage {
  newMessage {
    id
    stamp
    host
    text
  }
}`

export const defaultNatsHttpurl = 'https://natsql.dl.imetrical.com/graphql'

export function NatsBridge ({ maxRows = 4 }) {
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

  return <MessagesLayout messages={messages} maxRows={maxRows} />
}

function MessagesLayout ({ messages, maxRows = 0 }) {
  if (!messages) return <p>---</p>

  const rows = [
    ['id', 'stamp', 'host', 'text'],
    ...messages.map((msg) => {
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
  return rows.map((row, r) => {
    const sx = (r) ? { fontFamily: 'monospace' } : { color: 'primary', fontWeight: 'bold' }
    const rk = row[0]
    return row.map((c, i) => (<span sx={sx} key={rk + '-' + i}>{c}</span>))
  })
}
