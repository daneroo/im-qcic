import React, { Component } from 'react'
import PropTypes from 'prop-types'

export default class Simple extends Component {
  render () {
    const {
      text
    } = this.props

    return (
      <div style={{ border: '2px solid red' }}>
        Library: {text}
      </div>
    )
  }
}

Simple.propTypes = {
  text: PropTypes.string
}
