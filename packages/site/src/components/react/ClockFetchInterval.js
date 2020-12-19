
import React from 'react'
import useSWR from 'swr'
import fetch from 'unfetch'

const fetcher = url => fetch(url).then(r => r.json())

export function ClockFetchInterval ({
  url = 'https://time.qcic.n.imetrical.com/',
  refreshInterval = 1000
}) {
  const { data, error, isValidating } = useSWR(url, fetcher, { refreshInterval })
  const isLoading = !error && !data
  const pretty = JSON.stringify({ isValidating, isLoading, error, data }, null, 2)
  return (
    <div>
      <div>useSWR('{url}',fetcher,{JSON.stringify({ refreshInterval })})</div>
      <pre>{pretty}</pre>
    </div>
  )
}
