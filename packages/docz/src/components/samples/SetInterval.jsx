import React from 'react'

// TODO(daneroo): make tick async
//  The original idea was just to re-render on each tick
// - easy way to re-render on delay forever
// - easy way to render only once
// tick: only setState if !done
export default class SetInterval extends React.Component {
  constructor (props) {
    super(props)
    this.state = { stamp: new Date().toISOString() }
  }

  componentDidMount () {
    if (!this.props.once) {
      this.interval = setInterval(() => {
        this.setState({ stamp: new Date().toISOString() })
      }, this.props.delay)
    }
  }

  componentWillUnmount () {
    clearInterval(this.interval)
  }

  render () {
    return this.props.render(this.state)
  }
}

SetInterval.defaultProps = {
  delay: 1000,
  once: false,
  render: (state) => {
    // console.log('render', state)
    return (<pre>default-o-rama:{JSON.stringify(state)}</pre>)
  }
}
