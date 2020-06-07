/* global fetch */
import React from 'react'
import renderer from 'react-test-renderer'

import { Fetch } from '../src/index.js'

import { enableFetchMocks, disableFetchMocks } from 'jest-fetch-mock'

beforeAll(enableFetchMocks)
beforeEach(() => fetch.resetMocks())
afterAll(disableFetchMocks)

describe('Fetch', () => {
  test('import Fetch', () => {
    expect(typeof Fetch).toBe('function')
  })
  test('Fetch renders', (done) => {
    //  {"time":"2020-06-06T17:19:47.338Z"}
    fetch.mockResponses(...[
      { time: '2020-06-06T17:19:47.338Z' }
    ].map(r => JSON.stringify(r)))

    const component = renderer.create(
      <Fetch
        url='https://time.qcic.n.imetrical.com/'
        render={({ loading, error, data }) => {
          if (loading) return <p>Loading...</p>
          if (error) return <p>{error.name}: {error.message}</p>
          return (<pre>{JSON.stringify(data)}</pre>)
        }}
      />
    )

    // wait for render to occur
    setTimeout(() => {
      const tree = component.toJSON()
      expect(tree).toMatchSnapshot()
      done()
    }, 10)
  })
})
