import React from 'react'
import renderer from 'react-test-renderer'

import { Welcome } from '../index'

describe('Welcome', () => {
  test('import Welcome', () => {
    expect(typeof Welcome).toBe('function')
  })
  test('Welcome renders', () => {
    const component = renderer.create(
      <Welcome />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
  test('Welcome renders with a param', () => {
    const component = renderer.create(
      <Welcome name={'Daniel'} />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})
