import React, { useState, useEffect } from 'react'
import useInterval from './useInterval'

export default function Fetch ({
  url = 'https://time.qcic.n.imetrical.com',
  poll = false,
  delay = 1000,
  children
}) {
  const [data, setData] = useState()

  const fetchData = async () => {
    console.log('Fetch', { url })
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
    fetchData() // now - once before setInterval
    useInterval(() => {
      fetchData()
    }, delay)
  }

  if (!React.Children.count(children)) {
    return (<div />)
  }

  return React.Children.map(children, child => {
    return React.cloneElement(child, {
      data: data
    })
  })
}
