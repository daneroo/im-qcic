import { useState, useEffect } from 'react'
import axios from 'axios'

export function useFetch (url) {
  const [error, setError] = useState()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState()

  const refetch = async () => {
    setLoading(true)
    try {
      const response = await axios.get(url)
      if (response.status === 200) {
        setData(response.data)
      }
      // await setData({ a: 42 })
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
