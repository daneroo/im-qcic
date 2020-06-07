/* global fetch */
import { useState, useEffect } from 'react'

export function useFetch (url) {
  const [error, setError] = useState()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState()

  const refetch = async () => {
    setLoading(true)
    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setData(data)
      } else {
        setError(new Error(response.statusText))
      }
    } catch (error) {
      setError(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    refetch()
  }, [url])

  return { error, loading, data, refetch }
}

export function _dummy () {
  return (<div />)
}
