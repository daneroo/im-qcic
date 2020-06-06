import { useState, useEffect } from 'react'
import axios from 'axios'

export function useFetch (url) {
  const [error, setError] = useState()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState()

  const refetch = async () => {
    setLoading(true)
    try {
      // axios version
      const response = await axios.get(url)
      if (response.status === 200) {
        setData(response.data)
      } else {
        setError(new Error(response.statusText))
      }

      //  fetch version
      // const response = await fetch(url)
      // if (response.ok) {
      //   const data = await response.json()
      //   setData(data)
      // } else {
      //   setError(new Error(response.statusText))
      // }
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
