/* global fetch */

import React from 'react'

// This is my own api
const timeAPI = 'https://time.qcic.n.imetrical.com/'

function delay (millis) {
  return function (value) {
    return new Promise(resolve =>
      setTimeout(() => {
        resolve(value)
      }, millis)
    )
  }
}
class FetchDate extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      error: null,
      isLoaded: false,
      liveStamp: '',
      buildStamp: new Date().toISOString()
    }
  }

  componentDidMount () {
    Promise.resolve(42)
      // artificial delay to show Loading...
      .then(delay(1000))
      .then(() => fetch(timeAPI))
      .then(resp => resp.json())
      .then(result => {
        this.setState({
          isLoaded: true,
          liveStamp: result.time
        })
      })
      .catch(error => {
        this.setState({
          isLoaded: true,
          error
        })
      })
  }

  render () {
    const { error, isLoaded, liveStamp, buildStamp } = this.state

    let live
    if (error) {
      live = <div style={{ color: 'red' }}>Error: {error.message}</div>
    } else if (!isLoaded) {
      live = <div style={{ color: 'blue' }}>Fetching...</div>
    } else {
      live = (
        <div>
          Rendered after delay and fetch
          : <span style={{ color: 'green' }}>{liveStamp}</span>
        </div>
      )
    }
    return (
      <div style={{ fontFamily: 'Helvetica Neue,Helvetica,Arial,sans-serif' }}>
        {live}
        <div style={{ color: 'grey' }}>Initial render time : {buildStamp}</div>
      </div>
    )
  }
}

export default FetchDate
