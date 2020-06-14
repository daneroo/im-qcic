
import {
  useApolloClient,
  registerApolloClient,
  newApolloClient
} from '../index'

describe('useApolloClient', () => {
  test('import useApolloClient', () => {
    expect(typeof useApolloClient).toBe('function')
  })
  test('import registerApolloClient', () => {
    expect(typeof registerApolloClient).toBe('function')
  })
  test('import newApolloClient', () => {
    expect(typeof newApolloClient).toBe('function')
  })
})
