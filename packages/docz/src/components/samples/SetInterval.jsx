import React from 'react'

// TODO(daneroo): make tick async
//  The original idea was just to re-render on each tick
// - easy way to re-render on delay forever
// - easy way to render only once
// tick: only setState if !done
export default class SetInterval extends React.Component {
  constructor (props) {
    super(props)
    this.state = { ...props.initialState }
  }
  componentDidMount () {
    console.log('---', this.state, this.props)

    const { done, state } = this.props.tick(this.state)
    this.setState(state)
    console.log('one', this.state)
    if (!done) {
      this.interval = setInterval(() => {
        // const counter = this.state.counter + 1
        const { done, state } = this.props.tick(this.state)
        if (done) {
          console.log('clr', this.state)
          clearInterval(this.interval)
          delete this.interval
        } else {
          this.setState(state)
          console.log('inc', this.state)
        }
        console.log('===', this.state)
      }, this.props.delay)
    }
  }
  componentWillUnmount () {
    clearInterval(this.interval)
  }
  render () {
    // return this.props.render({ counter: this.state.counter })
    return this.props.render(this.state)
  }
}
SetInterval.defaultProps = {
  delay: 1000,
  initialState: { counter: 0 },
  // tick: (state) => ({ done: true, state }),
  tick: (state) => ({
    // done: Math.random() < 0.1,
    // done: state.counter >= 3,
    // done: false,
    done: true,
    state: { counter: state.counter + 1 }
  }),
  iterations: -1,
  // render: (state) => (null)
  render: (state) => {
    console.log('render', { state })
    return (<div>default-o-rama:{JSON.stringify(state)}</div>)
  }
}
