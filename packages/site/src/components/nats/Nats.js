import React, { useRef, useEffect, useState } from 'react'
import { connect, JSONCodec } from 'nats.ws'
import { df } from '../df'

export function Subscribe ({
  wsurl = 'wss://nats.dl.imetrical.com',
  // wsurl = 'ws://nats.ts.imetrical.com:9222',
  subject = 'im.qcic.heartbeat',
  maxRows = 5
}) {
  const [messages, setMessages] = useState([])
  useSubscribe({ wsurl, subject, maxRows, messages, setMessages })

  return (
    <div>
      <div>Nats ({subject})</div>
      {/* {messages.map((message, i) => (
        <pre key={message?.id || message?.stamp}>{JSON.stringify({ message })}</pre>
      ))} */}

      <pre>{JSON.stringify({ messages }, null, 2)}</pre>
      {/* <MessagesLayout messages={messages} maxRows={maxRows} /> */}
    </div>
  )
}

function useSubscribe ({ wsurl, subject, maxRows, messages, setMessages }) {
  const ncRef = useRef(null)
  const subRef = useRef(null)
  const messagesRef = useRef(messages)
  const setMessagesRef = useRef(setMessages)

  useEffect(() => {
    messagesRef.current = messages
    setMessagesRef.current = setMessages
  }, [messages, setMessages])

  useEffect(() => {
    async function connectToNats () {
      try {
        console.log(`Connecting to: ${wsurl}`)
        const nc = await connect({
          name: 'react-nats.ws',
          servers: wsurl,
          // pendingLimit: 8192
          maxReconnectAttempts: -1
        })
        console.log(`Connected to: ${wsurl}`)
        ncRef.current = nc

        const jc = JSONCodec()
        console.log(`Subscribe to: ${subject}`)
        const sub = nc.subscribe(subject, {})
        subRef.current = sub
        setTimeout(async () => {
          for await (const m of sub) {
            const jm = jc.decode(m.data)
            // console.log(JSON.stringify(jm))
            setMessagesRef.current([...messagesRef.current, jm].slice(-maxRows))
          }
        }, 0)
      } catch (err) {
        console.error('Nats connection error', err)
      }
    }
    connectToNats()

    return () => {
      if (subRef.current) {
        console.log(`Unsubscribe from: ${subject}`)
        subRef.current.unsubscribe(0)
      } else {
        console.log(`Skip unsubscribe from: ${subject} (not subscribed)`)
      }

      if (ncRef.current) {
        console.log(`Disconnect from: ${wsurl}`)
        ncRef.current.close()
      } else {
        console.log(`Skip disconnect from: ${wsurl} (not connected)`)
      }
    }
  }, [wsurl, subject, maxRows]) // Make sure the effect runs only once
}

// eslint-disable-next-line no-unused-vars
function MessagesLayout ({ messages, maxRows = 0 }) {
  if (!messages) return <p>---</p>
  const headers = messages.length
    ? Object.keys(messages[0])
    : ['stamp', 'host', 'text']
  const rows = [
    headers,
    ...messages
      .map(msg => {
        const { stamp, host, text } = msg
        const row = [df(stamp, 'HH:mm:ss'), host, text]
        return row
      })
      .slice(-maxRows)
  ]

  const gridCSS = {
    display: 'grid',
    columnGap: '1em',
    gridTemplateColumns: 'repeat(2, auto) 1fr'
  }
  return (
    <div style={gridCSS}>
      <Rows rows={rows} />
    </div>
  )
}

function Rows ({ rows }) {
  return rows.map((row, r) => {
    const sx = r
      ? { fontFamily: 'monospace' }
      : { color: 'primary', fontWeight: 'bold' }
    const rk = row[0]
    return row.map((c, i) => (
      <span sx={sx} key={rk + '-' + i}>
        {c}
      </span>
    ))
  })
}
