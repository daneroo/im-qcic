
import React, { useRef, useEffect, useState } from 'react'
import { connect, JSONCodec } from 'nats.ws'
import { df } from '../df'

export function Subscribe ({
  wsurl = 'wss://nats.dl.imetrical.com',
  topic = 'im.qcic.heartbeat',
  maxRows = 10
}) {
  const [messages, setMessages] = useState([])
  useSubscribe({ wsurl, topic, maxRows, messages, setMessages })

  return (
    <div>
      <div>Nats ({wsurl})</div>
      {/* <pre>{JSON.stringify({ messages }, null, 2)}</pre> */}
      <MessagesLayout messages={messages} maxRows={maxRows} />

    </div>
  )
}

function useSubscribe ({ wsurl, topic, maxRows, messages, setMessages }) {
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
      console.log(`Connect to: ${wsurl}`)
      const nc = await connect({
        servers: wsurl,
        pendingLimit: 8192
      })
      ncRef.current = nc

      const jc = JSONCodec()
      console.log(`Subscribe to: ${topic}`)
      const sub = nc.subscribe(topic, { })
      subRef.current = sub
      setTimeout(async () => {
        for await (const m of sub) {
          const jm = jc.decode(m.data)
          // console.log(JSON.stringify(jm))
          setMessagesRef.current([...messagesRef.current, jm].slice(-maxRows))
        }
      }, 0)
    }
    connectToNats()

    return () => {
      console.log(`Unsubscribe from: ${topic}`)
      subRef.current.unsubscribe(0)

      console.log(`Disconnect from: ${wsurl}`)
      ncRef.current.close()
    }
  }, [wsurl, topic, maxRows]) // Make sure the effect runs only once
}

function MessagesLayout ({ messages, maxRows = 0 }) {
  if (!messages) return <p>---</p>

  const rows = [
    ['stamp', 'host', 'text'],
    ...messages.map((msg) => {
      const { stamp, host, text } = msg
      const row = [df(stamp, 'HH:mm:ss'), host, text]
      return row
    }).slice(-maxRows)]

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
    const sx = (r) ? { fontFamily: 'monospace' } : { color: 'primary', fontWeight: 'bold' }
    const rk = row[0]
    return row.map((c, i) => (<span sx={sx} key={rk + '-' + i}>{c}</span>))
  })
}
