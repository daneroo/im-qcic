import 'jest-dom/extend-expect'

import qcicReact from '../src'

describe('qcicReact', () => {
  test('import qcicReact from "qcic-react"', () => {
    expect(typeof qcicReact).toBe('object')
  })
})
