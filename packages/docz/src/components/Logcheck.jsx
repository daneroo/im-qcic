
import React from 'react'
import { Fetch } from './samples/Fetch.jsx'
import { Table } from './Table'
import data0 from '../data/logcheck.json'
import { df } from './df'

function shorten (i, j, v) {
  if (i === 0) { // header remove domain names
    return v.split('.')[0]
  }
  if (j === 0) return df(v) // date (no day, no seconds)
  if (j > 0) return v.substr(0, 7)
  return v
}

export default function Logcheck () {
  return (
    <Fetch url='https://status.qcic.n.imetrical.com/logcheck.json'
      poll={false}
      delay={1000}>
      <Injecter />
    </Fetch>
  )
}
function Injecter ({ data }) {
  data = data || data0
  return <Table meta={data.meta} data={data.data.slice(0, 7)} mapper={shorten} />
}
