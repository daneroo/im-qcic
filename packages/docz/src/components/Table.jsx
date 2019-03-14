
import React from 'react'

// map data[i][j] => f(i,j,data[i][j])
export function map2d (data, f) { //
  return data.map((row, i) => {
    return row.map((col, j) => {
      return f(i, j, col)
    })
  })
}

export function Table ({ meta, data, mapper }) {
  if (mapper) data = map2d(data, mapper)
  return (
    <table style={{ textAlign: 'Zcenter', fontSize: '100%' }}>
      <Header row={data[0]} />
      <tbody>
        {data.slice(1).map((row, i) => {
          return (<Body key={i} row={row} />)
        })}
      </tbody>

    </table>)
}

export function Header ({ row }) {
  return <thead><tr>{
    row.map((col, i) => <th key={i}>{col}</th>)
  }</tr></thead>
}

export function Body ({ row }) {
  return <tr>{
    row.map((col, i) => <td style={{ padding: '0 .5em' }} key={i}>{col}</td>)
  }</tr>
}
