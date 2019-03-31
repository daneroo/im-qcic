import { Greeter } from '../index'

describe('Greeter', () => {
  test('Greeter', () => {
    expect(Greeter('Carl').startsWith('Hello Carl')).toEqual(true)
  })
})
