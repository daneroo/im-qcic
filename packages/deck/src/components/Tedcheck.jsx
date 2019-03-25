
import React from 'react'
import { Fetch } from '@daneroo/qcic-react'
import { Table } from './Table'
import { meta as meta0, data as data0 } from '../data/tedcheck.json'
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

function Injecter ({ meta, data }) {
  meta = meta || meta0
  data = data || data0
  return (
    <div>
      <Table meta={meta} data={data.missingLastDay} mapper={shorten} />
      {/* <Table meta={meta} data={data.missingWeekByDay.slice(0, 1)} mapper={shorten} />
      <Table meta={meta} data={data.missingDayByHour.slice(0, 1)} mapper={shorten} /> */}
    </div>
  )
}
