/* global fetch */
// This was taken from: https://github.com/donavon/use-interval
// a.k.a. npm i @use-it/interval
// PR my changes upstream
// I brought it here to see if my build can handle it.

import { renderHook, cleanup, act } from '@testing-library/react-hooks'
import '@testing-library/jest-dom/extend-expect'
import { useFetch } from '../src'

import { enableFetchMocks, disableFetchMocks } from 'jest-fetch-mock'

beforeAll(enableFetchMocks)
beforeEach(() => fetch.resetMocks())
afterEach(cleanup)
afterAll(disableFetchMocks)

describe('useFetch', async () => {
  test('mocking sanity check', async () => {
    const url = 'https://time.qcic.n.imetrical.com'
    fetch.mockResponses(...[
      { time: '2020-06-07T21:16:01Z' },
      { time: '2020-06-07T21:16:02Z' }
    ].map(r => JSON.stringify(r)))

    // first call
    const response = await fetch(url)
    const data = await response.json()
    expect(data).toEqual({ time: '2020-06-07T21:16:01Z' })

    expect(fetch.mock.calls.length).toEqual(1)
    expect(fetch.mock.calls[0][0]).toEqual(url)

    // second call
    const response2 = await fetch(url)
    const data2 = await response2.json()
    expect(data2).toEqual({ time: '2020-06-07T21:16:02Z' })

    expect(fetch.mock.calls.length).toEqual(2)
    expect(fetch.mock.calls[1][0]).toEqual(url)
  })
  test('initial render (before actual fetch)', async () => {
    const url = 'https://time.qcic.n.imetrical.com'// should be mocked

    let error, loading, data, refetch

    const { result } = renderHook(() => {
      ({ error, loading, data, refetch } = useFetch(url))
    })

    // before fetch
    expect(result).toBeDefined()
    expect(error).toBeFalsy()
    expect(loading).toBe(true)
    expect(data).toBeUndefined()
    // expect(data).toEqual({ a: 42 })
    expect(typeof refetch).toBe('function')
  })
  test('is passed a `url` and rendered 3 times', async () => {
    const url = 'https://time.qcic.n.imetrical.com'
    fetch.mockResponses(...[
      { time: '2020-06-07T21:16:01Z' },
      { time: '2020-06-07T21:16:02Z' },
      { time: '2020-06-07T21:16:03Z' }
    ].map(r => JSON.stringify(r)))

    let error, loading, data, refetch

    const { waitForNextUpdate } = renderHook(() => {
      ({ error, loading, data, refetch } = useFetch(url))
    })

    // wait for fetch to complete
    await waitForNextUpdate()

    // after fetch
    expect(error).toBeFalsy()
    expect(loading).toBe(false)
    expect(data).toEqual({ time: '2020-06-07T21:16:01Z' })

    // second fetch
    await refetch()
    expect(data).toEqual({ time: '2020-06-07T21:16:02Z' })

    // third fecth
    // what does this mean? vs straight `await refetch()`
    await act(async () => {
      await refetch()
    })
    expect(data).toEqual({ time: '2020-06-07T21:16:03Z' })
  })
})
