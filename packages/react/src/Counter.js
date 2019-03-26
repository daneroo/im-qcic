
import React, { useState } from 'react'

export default function Counter ({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount)

  return (
    <div>
      Count: {count}
      <br />
      <br />
      <button onClick={() => setCount(initialCount)}>Reset</button>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  )
}
