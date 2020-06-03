import React from 'react'

export function Stringify ({ data }) {
  return (
    <div>
      <pre style={{ textAlign: 'left', fontSize: '70%' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
