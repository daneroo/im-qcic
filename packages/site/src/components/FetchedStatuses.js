
import React from 'react'
import useSWR from 'swr'
import fetch from 'unfetch'

import logcheck0 from '../data/logcheck.json'
import tedcheck0 from '../data/tedcheck.json'
import Table from './Table'
import { df, dfn } from './df'

const fetcher = url => fetch(url).then(r => r.json())

export function Summary ({ refreshInterval = 10000, url = 'https://status.dl.imetrical.com/api/version' }) {
  const { data: dataLive, error } = useSWR(url, fetcher, { refreshInterval })

  const data = dataLive || logcheck0
  return (
    <table>
      <tbody>
        <tr>
          <td>It is now  </td><td>{df(new Date().toISOString(), 'HH:mm:ss')}</td>
        </tr>
        {data ? <tr><td>Last Fetched at</td><td>{df(data.stamp, 'HH:mm:ss')} - {dfn(data.stamp)}</td></tr> : <></>}
        {error ? <tr><td>Error</td><td>{error.message}</td></tr> : <></>}
      </tbody>
    </table>
  )
}

export function Tedcheck ({ refreshInterval = 60000, url = 'https://status.dl.imetrical.com/api/tedcheck' }) {
  const { data: dataLive, error } = useSWR(url, fetcher, { refreshInterval })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  function mapper (i, j, v) {
    if (i > 0 && j === 0) return df(v, 'YYYY-MM-DD HH:mm') // date (no day, no seconds)
    return v
  }

  const data = dataLive || tedcheck0
  return (
    <div>
      <Table meta={data.meta} data={data.data.missingLastDay} mapper={mapper} />
      <Table meta={data.meta} data={data.data.missingWeekByDay} mapper={mapper} />
      <Table meta={data.meta} data={data.data.missingDayByHour} mapper={mapper} />
    </div>
  )
}

export function ScrobbleCheck ({ refreshInterval = 60000, url = 'https://status.dl.imetrical.com/api/logcheck' }) {
  const { data: dataLive, error } = useSWR(url, fetcher, { refreshInterval })
  if (error) {
    return <div>Error: {error.message}</div>
  }

  function mapper (i, j, v) {
    if (i === 0) { // header remove domain names
      return v.split('.')[0]
    }
    if (j === 0) return df(v) // date (no day, no seconds)
    if (j > 0) return v.substr(0, 7)
    return v
  }

  const data = dataLive || logcheck0
  return <Table meta={data.meta} data={data.data.slice(0, 7)} mapper={mapper} />
}
