/* global fetch */
import React from 'react'
export default class Fetch extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      loading: false,
      error: null,
      data: null
    }
  }

  componentDidMount () {
    Promise.resolve(42)
      .then(() => this.setState({ loading: true }))
      .then(() => fetch(this.props.url))
      .then(resp => resp.json())
      .then(data => {
        this.setState({ loading: false, data })
      })
      .catch(error => {
        this.setState({ loading: false, error })
      })
  }

  render () {
    // const { loading, error, data } = this.state
    return this.props.render(this.state)
  }
}

Fetch.defaultProps = {
  delay: 5000,
  url: 'https://time.qcic.n.imetrical.com/',
  render: ({ loading, error, data }) => {
    // console.log('render', { loading, error, data })
    if (loading) return <p>Loading...</p>
    if (error) return <p>{error.name}: {error.message}</p>
    return (<pre>default-o-rama:{JSON.stringify(data)}</pre>)
  }
}
