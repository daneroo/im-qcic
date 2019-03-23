
import React from 'react'
import PropTypes from 'prop-types'

function Welcome ({ name = 'Dan-eroo' }) {
  return (<h1>Hello, {name}</h1>)
}

Welcome.propTypes = {
  /**
   * This is a pretty good description for this prop
   */
  name: PropTypes.string
}

Welcome.defaultProps = {
  name: 'Dan-eroo'
}

export default Welcome
