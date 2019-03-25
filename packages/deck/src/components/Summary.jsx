
import React from 'react'
import { Fetch } from '@daneroo/qcic-react'
import { meta as meta0, data as data0 } from '../data/logcheck.json'
import { df, dfn } from './df'

export default function Summary () {
  return (
    <Fetch url='https://status.qcic.n.imetrical.com/logcheck.json'
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
    <table><tbody><tr>
      <td>It is now  </td><td>{df()}</td>
    </tr><tr>
      <td>Published at</td><td>{df(meta.stamp)} - {dfn(meta.stamp)}</td>
    </tr></tbody></table>
  )
}
