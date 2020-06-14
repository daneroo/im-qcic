
/** @jsx jsx */
import { jsx } from 'theme-ui'
import { df } from '../df'

export function Messages ({ messages, maxRows = 0 }) {
  if (!messages) return <p>---</p>

  const rows = [
    ['id', 'stamp', 'text'],
    ...messages.map((msg) => {
      const { id, stamp, text } = msg
      const row = [id.slice(-5), df(stamp, 'HH:mm:ss'), text]
      return row
    }).slice(-maxRows)]

  const gridCSS = {
    display: 'grid',
    columnGap: '1em',
    gridTemplateColumns: 'repeat(3, auto)'
  }
  return (
    <div style={gridCSS}>
      <Rows rows={rows} />
    </div>
  )
}

function Rows ({ rows }) {
  return rows.map((row, r) => {
    const sx = (r) ? { fontFamily: 'monospace' } : { color: 'primary', fontWeight: 'bold' }
    const rk = row[0]
    return row.map((c, i) => (<span sx={sx} key={rk + '-' + i}>{c}</span>))
  })
}
