
import React from 'react'
import { useInterval, useFetch } from '@daneroo/qcic-react'

export function ClockFetchInterval ({ url = 'https://time.qcic.n.imetrical.com/', delay = 1000 }) {
  const { error, loading, data, refetch } = useFetch(url)

  useInterval(() => {
    refetch()
  }, delay)

  return (
    <div>
      <div>useInterval({JSON.stringify({ delay })})</div>
      <div>useFetch({JSON.stringify({ url })})</div>
      <pre>{JSON.stringify({ error, loading, data }, null, 2)}</pre>
    </div>
  )
}
