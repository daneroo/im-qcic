
import React, { useState } from 'react'
import gql from 'graphql-tag'
import { Query, Subscription } from 'react-apollo'
import { RegisterApolloProvider } from '@daneroo/qcic-apollo-client-setup'

const helloQy = gql`
  query {
    hello
  }`

const fizzBuzzSubscription = gql`
  subscription {
    newMessage {
      id
      stamp
      text
    }
  }
`

function Demo ({ httpurl = 'https://fizzbuzzclock.n.imetrical.com/graphql', initialVisible }) {
  return <div>
    <h6>GraphQL Endpoint => {httpurl}</h6>
    <ShowHide httpurl={httpurl} initialVisible={initialVisible}>
      <Hello />
      <FizzBuzzClock />
    </ShowHide>
  </div>
}
export default Demo

function ShowHide ({ httpurl, children, initialVisible = false }) {
  const [visible, setVisible] = useState(initialVisible)

  return (
    <div>
      <button onClick={() => setVisible(!visible)}>
        {visible ? 'Hide' : 'Show'}
      </button>
      { visible && <RegisterApolloProvider httpurl={httpurl}>{children}</RegisterApolloProvider> }
    </div>
  )
}

function Hello () {
  return <Query
    query={helloQy}
  >
    {({ loading, error, data }) => {
      if (loading) return <p>Loading...</p>
      if (error) return <p>Error :(</p>
      return <div>Hello: <b>{data.hello}</b></div>
    }}
  </Query>
}

function FizzBuzzClock () {
  return <Subscription subscription={fizzBuzzSubscription} >
    {({ data, loading, error }) => {
      // {!error && !loading && JSON.stringify(data)}
      if (loading) return <p>Loading...</p>
      if (error) return <p>Error :(</p>
      if (!data || !data.newMessage) return <p>---</p>

      const { id, stamp, text } = data.newMessage
      return <div>
        Fizz|Buzz:<pre style={{ display: 'inline' }} >
          <span><b>...{id.substr(-5)}</b> </span>
          <span><b>{stamp.substring(10, 19)}</b> </span>
          <span><b>{text}</b></span>
        </pre>
      </div>
    }}
  </Subscription>
}
