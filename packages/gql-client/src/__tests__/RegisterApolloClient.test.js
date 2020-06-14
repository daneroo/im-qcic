// import React from 'react'
// import renderer from 'react-test-renderer'

import { RegisterApolloProvider } from '../index'

describe('RegisterApolloProvider', () => {
  test('import RegisterApolloProvider', () => {
    expect(typeof RegisterApolloProvider).toBe('function')
  })
  // test('RegisterApolloClient renders', () => {
  //   const component = renderer.create(
  //     <RegisterApolloClient />
  //   )
  //   const tree = component.toJSON()
  //   expect(tree).toMatchSnapshot()
  // })
})
