import 'jest-dom/extend-expect'

import { Welcome } from '../src'

describe('Welcome', () => {
  test('import Welcome from "qcic-react"', () => {
    expect(typeof Welcome).toBe('function')
  })
})
