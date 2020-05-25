
import React, { useState, useEffect, useRef } from 'react'

export function Wilkomen () {
  const [count, setCount] = useState(0)

  useInterval(() => {
    // Your custom logic here
    setCount(count + 1)
  }, 1000)

  return (<h4>Counting: {count} from a component in a library with a hook</h4>)
}

function useInterval (callback, delay) {
  const savedCallback = useRef()

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick () {
      savedCallback.current()
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}
