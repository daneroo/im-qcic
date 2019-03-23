
import React from 'react'
import { Fetch } from './samples/Fetch.jsx'
import { Table } from './Table'
import data0 from '../data/tedcheck.json'
import { df } from './df'

function shorten (i, j, v) {
  if (i > 0 && j === 0) return df(v, 'YYYY-MM-DD HH:mm') // date (no day, no seconds)
  return v
}

export default function Tedcheck () {
  return (
    <Fetch url='https://status.qcic.n.imetrical.com/tedcheck.json'
      poll={false}
      delay={1000}>
      <Injecter />
    </Fetch>
  )
}

function Injecter ({ data }) {
  data = data || data0
  return (
    <div>
      <Table meta={data.meta} data={data.data.missingLastDay} mapper={shorten} />
      <Table meta={data.meta} data={data.data.missingWeekByDay} mapper={shorten} />
      <Table meta={data.meta} data={data.data.missingDayByHour} mapper={shorten} />
    </div>
  )
}
