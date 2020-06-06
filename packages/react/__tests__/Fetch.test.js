import React from 'react'
import renderer from 'react-test-renderer'

import { Fetch } from '../src/index.js'

describe('Fetch', () => {
  test('import Fetch', () => {
    expect(typeof Fetch).toBe('function')
  })
  test('Fetch renders', (done) => {
    const component = renderer.create(
      <Fetch
        url='https://time.qcic.n.imetrical.com/'
        render={({ loading, error, data }) => {
          if (loading) return <p>Loading...</p>
          if (error) return <p>{error.name}: {error.message}</p>
          try {
            const time = Date.parse(data.time)
            if (Number.isNaN(time)) {
              data = 'Unable to parse Date'
            }
            data = { time: '2020-06-06T17:19:47.338Z' }
          } catch (error) {
            data = error.message
          }

          return (<pre>{JSON.stringify(data)}</pre>)
        }}
      />
    )

    setTimeout(() => {
      const tree = component.toJSON()
      expect(tree).toMatchSnapshot()
      done()
    }, 1000)
  })
})

// function delay (ms) {
//   return new Promise(resolve => setTimeout(resolve, ms))
// }
