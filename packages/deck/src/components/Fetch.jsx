import React, { useState, useEffect } from 'react'
import useInterval from './useInterval'

export function Fetch ({
  url = 'https://status.qcic.n.imetrical.com/logcheck.json',
  poll = false,
  delay = 1000,
  children
}) {
  const [data, setData] = useState('...')

  const fetchData = async () => {
    // console.log('Fetch', { url })
    try {
      const resp = await window.fetch(url)
      const json = await resp.json()
      setData(json)
    } catch (error) {
      console.error(error)
      setData(error.message)
    }
  }

  if (!poll) {
    useEffect(() => {
      fetchData()
    }, [])
  } else {
    useInterval(() => {
      // setCount(count + 1);
      fetchData()
    }, delay)
  }

  // return <Stringify data={data} />
  return React.Children.map(children, child => {
    return React.cloneElement(child, {
      data: data.data,
      meta: data.meta
    })
  })
}

export function Poll ({ initialUrl = 'https://status.qcic.n.imetrical.com/logcheck.json' }) {
  const [url, setUrl] = useState(initialUrl)
  const [polling, setPolling] = useState(false)
  const toggle = () => setPolling(!polling)
  return (
    <div>
      <input
        type='text'
        value={url}
        onChange={event => setUrl(event.target.value)}
      />
      <button onClick={toggle}>
        {polling ? 'Stop Polling' : 'Start Polling'}
      </button>
      { polling && <Fetch url={url} />}
    </div>
  )
}

export function Stringify ({ data }) {
  return (
    <div>
      <pre style={{ textAlign: 'left', fontSize: '70%' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
