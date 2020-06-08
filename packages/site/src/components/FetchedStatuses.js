
import React from 'react'
import { useInterval, useFetch } from '@daneroo/qcic-react'
import logcheck0 from '../data/logcheck.json'
import tedcheck0 from '../data/tedcheck.json'
import Table from './Table'
import { df, dfn } from './df'

export function Summary ({ delay = 1000, url = 'https://status.qcic.n.imetrical.com/logcheck.json' }) {
  const { data: dataLive, refetch } = useFetch(url)
  useInterval(refetch, delay)

  const data = dataLive || logcheck0
  return (
    <table>
      <tbody>
        <tr>
          <td>It is now  </td><td>{df(new Date().toISOString(), 'HH:mm:ss')}</td>
        </tr>
        <tr>
          <td>Published at</td><td>{df(data.meta.stamp, 'HH:mm:ss')} - {dfn(data.meta.stamp)}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function Tedcheck ({ delay = 1000, url = 'https://status.qcic.n.imetrical.com/tedcheck.json' }) {
  const { data: dataLive, refetch } = useFetch(url)
  useInterval(refetch, delay)

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

export function ScrobbleCheck ({ delay = 1000, url = 'https://status.qcic.n.imetrical.com/logcheck.json' }) {
  const { data: dataLive, refetch } = useFetch(url)
  useInterval(refetch, delay)

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
