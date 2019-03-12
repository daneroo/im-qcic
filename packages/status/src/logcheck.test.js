'use strict'
const fs = require('fs')
const logcheck = require('./logcheck')
const jsonFile = __filename.replace('.js', '.json')

describe('@daneroo/qcic-status', () => {
  describe('logcheck', () => {
    describe('round10min', () => {
      test.each([
        // [name, expected, v],
        ['1', '2019-03-12T03:40:00Z', '2019-03-12T03:41:34Z'],
        ['2', '2019-03-12T03:40:00Z', '2019-03-12T03:46:34Z']
      ])('Check truth (%s)', (name, expected, v) => {
        expect(logcheck.round10min(v)).toBe(expected)
      })
    })

    // get json
    const { data } = JSON.parse(fs.readFileSync(jsonFile))

    describe('aggregate', () => {
      test.each([
        // [name, expected, v],
        ['happy', [
          ['checkpoint', 'darwin', 'dirac.imetrical.com', 'euler', 'newton'],
          [
            '2019-03-12T03:50:00Z',
            '838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871',
            '',
            '838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871',
            '838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871'

          ],
          [
            '2019-03-12T03:40:00Z',
            'e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33',
            'e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33',
            '0a79ce887263f6aaf97cf7ded9e44fc7fcca701ef3e70d983024dd5a89ecc5db',
            'e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33'
          ]
        ], data]
      ])('Check aggregate (%s)', (name, expected, v) => {
        expect(logcheck.aggregate(v)).toEqual(expected)
      })
    })
    describe('aggregate-short', () => {
      test.each([
        // [name, expected, v],
        ['short', [
          ['checkpoint', 'darwin', 'dirac.imetrical.com', 'euler', 'newton'],
          [
            '03:50:00Z',
            '838ae31',
            '',
            '838ae31',
            '838ae31'

          ],
          [
            '03:40:00Z',
            'e53d2ac',
            'e53d2ac',
            '0a79ce8',
            'e53d2ac'
          ]
        ], data]
      ])('Check aggregate (%s)', (name, expected, v) => {
        expect(logcheck.shorten(logcheck.aggregate(v))).toEqual(expected)
      })
    })
  })
})
