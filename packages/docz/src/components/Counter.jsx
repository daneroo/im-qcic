import React, { useState, useEffect, Fragment } from 'react'
import useInterval from './useInterval'

export function Fetch ({ url, once = true }) {
  const [data, setData] = useState('...')

  const fetchData = async () => {
    try {
      const resp = await window.fetch(url)
      const json = await resp.json()
      setData(JSON.stringify(json, null, 2))
    } catch (error) {
      console.error(error)
      setData(error.message)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // useInterval(() => {
  //   // setCount(count + 1);
  //   fetchData()
  // }, 1000)

  return (
    <div>
      <pre style={{ textAlign: 'left', fontSize: '70%' }}>
        {data}
      </pre>
    </div>
  )
}

export function Poll ({ initialUrl = 'public/logcheck.json' }) {
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
