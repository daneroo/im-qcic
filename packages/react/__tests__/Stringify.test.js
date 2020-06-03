import React from 'react'
import renderer from 'react-test-renderer'

import { Stringify } from '../src/index.js'

describe('Stringify', () => {
  test('import Stringify', () => {
    expect(typeof Stringify).toBe('function')
  })
  test('Stringify renders', () => {
    const component = renderer.create(
      <Stringify />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
  test('Stringify renders array', () => {
    const component = renderer.create(
      <Stringify data={[1, 2, 3]} />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
  test('Stringify renders nested Object', () => {
    const component = renderer.create(
      <Stringify data={{ this: 'one', that: 'other', those: ['extra', 'things'] }} />
    )
    const tree = component.toJSON()
    expect(tree).toMatchSnapshot()
  })
})
