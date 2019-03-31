import React from 'react'
import renderer from 'react-test-renderer'

import { Wilkomen } from '../index'

describe('Wilkomen', () => {
  test('import Wilkomen', () => {
    expect(typeof Wilkomen).toBe('function')
  })
  test('Wilkomen renders', () => {
    const component = renderer.create(
      <Wilkomen />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})
