// This was taken from: https://github.com/donavon/use-interval
// a.k.a. npm i @use-it/interval
// PR my changes upstream
// I brought it here to see if my build can handle it.

import { renderHook, cleanup, act } from '@testing-library/react-hooks'
import '@testing-library/jest-dom/extend-expect'
import { useFetch } from '../src'

afterEach(cleanup)

describe('useFetch', async () => {
  // TODO split out these tests
  // TODO should I mock axios?
  test('is passed a `url`', async () => {
    const url = 'https://time.qcic.n.imetrical.com'// should be mocked

    let error, loading, data, refetch

    const { result, /* rerender, */ waitForNextUpdate } = renderHook(() => {
      ({ error, loading, data, refetch } = useFetch(url))
    })

    // before fetch
    expect(result).toBeDefined()
    expect(error).toBeFalsy()
    expect(loading).toBe(true)
    expect(data).toBeUndefined()
    // expect(data).toEqual({ a: 42 })
    expect(typeof refetch).toBe('function')

    // wait for fetch to complete
    await waitForNextUpdate()

    // after fetch
    expect(error).toBeFalsy()
    expect(loading).toBe(false)
    expect(data).toHaveProperty('time')
    expect(typeof data.time).toBe('string')
    const time = Date.parse(data.time)
    expect(typeof time).toBe('number')
    expect(Number.isNaN(time)).toBe(false)

    await refetch()
    const time2 = Date.parse(data.time)
    expect(time2).toBeGreaterThan(time)

    // what does this mean? vs straight `await refetch()`
    await act(async () => {
      await refetch()
    })
    const time3 = Date.parse(data.time)
    expect(time3).toBeGreaterThan(time)
    expect(time3).toBeGreaterThan(time2)
  })
})
