
import React, { useState } from 'react'
import { useInterval, Fetch } from '@daneroo/qcic-react'

export function Counter ({ delay = 1000 }) {
  const [count, setCount] = useState(0)

  useInterval(() => {
    setCount(count => count + 1)
  }, delay)

  return (
    <div>
      <h4>Counter: {count}</h4>
    </div>
  )
}

export function Clock ({ delay = 1000 }) {
  const [count, setCount] = useState(0)

  useInterval(() => {
    setCount(count => count + 1)
  }, delay)

  const renderFunc = ({ loading, error, data }) => {
    if (loading) return <p>Loading...</p>
    if (error) return <p>{error.name}: {error.message}</p>
    return (<pre>Tada:{JSON.stringify(data)}</pre>)
  }
  return (
    <div>
      <h4>Counter: {count}</h4>
      <Fetch
        url={'https://time.qcic.n.imetrical.com/?' + count}
        render={renderFunc}
      />
    </div>
  )
}
