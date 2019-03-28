
import React from 'react'
import PropTypes from 'prop-types'

function Welcome ({ name = 'Dan-eroo' }) {
  return (<h4>Hello, {name}</h4>)
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
