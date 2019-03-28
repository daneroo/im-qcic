
import React from 'react'
import PropTypes from 'prop-types'

export default function Welcome ({ name = 'Dan-eroo' }) {
  return (<h4 style={{ border: '2px solid red' }}>Hello, {name}</h4>)
}

Welcome.propTypes = {
  name: PropTypes.string
}
