
import React from 'react'
import FetchInterval from './samples/FetchInterval'
import data0 from '../data/logcheck.json'
import { df, dfn } from './df'

export default function Summary () {
  return (
    <FetchInterval
      url='https://status.qcic.n.imetrical.com/logcheck.json'
      delay={10000}
      render={render}
    />
  )
}

function render ({ loading, error, data }) {
  data = data || data0
  return (
    <table>
      <tbody>
        <tr>
          <td>It is now  </td><td>{df(undefined, 'HH:mm:ss')}</td>
        </tr>
        <tr>
          <td>Published at</td><td>{df(data.meta.stamp)} - {dfn(data.meta.stamp)}</td>
        </tr>
      </tbody>
    </table>
  )
}
