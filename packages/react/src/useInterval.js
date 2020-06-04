// This was taken from: https://github.com/donavon/use-interval
// a.k.a. npm i @use-it/interval
// PR my changes upstream
// I brought it here to see if my build can handle it.

import { useEffect, useRef } from 'react'

export function useInterval (callback, delay) {
  const savedCallback = useRef()

  useEffect(
    () => {
      savedCallback.current = callback
    },
    [callback]
  )

  useEffect(
    () => {
      const handler = (...arguments_) => savedCallback.current(...arguments_)

      if (delay !== null) {
        const id = setInterval(handler, delay)
        return () => clearInterval(id)
      }
    },
    [delay]
  )
}
