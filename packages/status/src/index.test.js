'use strict'

describe('@daneroo/qcic-status', () => {
  describe('Smoke test', () => {
    test.each([
      // [name, expected, v],
      ['true', true, true]
    ])('Check truth (%s)', (name, expected, v) => {
      expect(v).toBe(expected)
    })
  })
})
