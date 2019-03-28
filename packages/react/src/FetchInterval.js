/* global fetch */

import React from 'react'
export default class FetchInterval extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      loading: false,
      error: null,
      data: null
    }
  }

  fetcData () {
    Promise.resolve(42)
      .then(() => this.setState({ loading: true, error: null }))
      .then(() => fetch(this.props.url))
      .then(resp => resp.json())
      .then(data => {
        this.setState({ loading: false, data })
      })
      .catch(error => {
        this.setState({ loading: false, error })
      })
  }

  componentDidMount () {
    this.fetcData()
    if (!this.props.once) {
      this.interval = setInterval(() => {
        this.fetcData()
      }, this.props.delay)
    }
  }

  componentWillUnmount () {
    clearInterval(this.interval)
  }

  render () {
    // const { loading, error, data } = this.state
    return this.props.render(this.state)
  }
}

FetchInterval.defaultProps = {
  delay: 10000,
  once: false,
  url: 'https://time.qcic.n.imetrical.com/',
  render: ({ loading, error, data }) => {
    // console.log('render', { loading, error, data })
    const heading = (loading)
      ? <span>Loading...</span>
      : (error)
        ? <span>{error.name}: {error.message}</span>
        : <span>Fetched</span>

    return (<pre>data: {JSON.stringify(data)} status: {heading} </pre>
    )
  }
}
