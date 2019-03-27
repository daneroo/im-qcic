
import React from 'react'
import { Fetch } from './samples/Fetch.jsx'
import data0 from '../data/logcheck.json'
import { df, dfn } from './df'

export default function Summary () {
  return (
    <Fetch url='https://status.qcic.n.imetrical.com/logcheck.json'
      poll
      delay={10000}>
      <Injecter />
    </Fetch>
  )
}

function Injecter ({ data }) {
  data = data || data0
  return (
    <table><tbody><tr>
      <td>It is now  </td><td>{df()}</td>
    </tr><tr>
      <td>Published at</td><td>{df(data.meta.stamp)} - {dfn(data.meta.stamp)}</td>
    </tr></tbody></table>
  )
}
