
import {
  registerApolloClient,
  newApolloClient,
  closeAll
} from '../index'

describe('apollo-client-setup', () => {
  test('import registerApolloCLient', () => {
    expect(typeof registerApolloClient).toBe('function')
  })
  test('import newApolloClient', () => {
    expect(typeof newApolloClient).toBe('function')
  })
  test('import closeAll', () => {
    expect(typeof closeAll).toBe('function')
  })
})
