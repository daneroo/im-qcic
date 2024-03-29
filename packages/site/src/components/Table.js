/** @jsx jsx */
import { jsx } from 'theme-ui'
import { df, dfn } from './df'

// map data[i][j] => f(i,j,data[i][j])
export function map2d (data, f) {
  //
  return data.map((row, i) => {
    return row.map((col, j) => {
      return f(i, j, col)
    })
  })
}

export default function Table ({ meta, data, mapper }) {
  if (mapper) data = map2d(data, mapper)
  if (!meta || !data) {
    return <div>No meta or data</div>
  }
  return (
    <table style={{ textAlign: 'center', fontSize: '100%' }}>
      <caption>
        Last fetched at {df(meta.stamp, 'YYYY-MM-DD')} - {dfn(meta.stamp)}
      </caption>
      <Header row={data[0]} />
      <tbody>
        {data.slice(1).map((row, i) => {
          return <Body key={i} row={row} />
        })}
      </tbody>
    </table>
  )
}

export function Header ({ row }) {
  return (
    <thead>
      <tr>
        {row.map((col, i) => (
          <th sx={{ color: 'primary' }} key={i}>
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function Body ({ row }) {
  const sx = {
    fontFamily: 'monospace',
    px: '1em'
  }
  return (
    <tr>
      {row.map((col, i) => (
        <td sx={sx} key={i}>
          {col}
        </td>
      ))}
    </tr>
  )
}
