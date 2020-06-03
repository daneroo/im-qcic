
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

// Combine a Query and a Subscription (from the same endpoint)
export function GQLDemo ({ httpurl = 'https://fizzbuzzclock.n.imetrical.com/graphql', initialVisible }) {
  return (
    <div>
      <ShowHide httpurl={httpurl} initialVisible={initialVisible}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: '10px'
        }}
        >
          <span>Query:</span>
          <Hello />
          <span>Subscription:</span>
          <FizzBuzzClock />
        </div>
      </ShowHide>
    </div>
  )
}

function ShowHide ({ httpurl, children, initialVisible = false }) {
  const [visible, setVisible] = useState(initialVisible)

  return (
    <div style={{ marginTop: '10px' }}>
      <div>
        <button onClick={() => setVisible(!visible)}>
          {visible ? 'Hide' : 'Show'}
        </button>
        <span style={{ paddingLeft: '10px', color: 'gray' }}>qraphQL endpoint {'=>'} {httpurl}</span>

      </div>
      {visible && <RegisterApolloProvider httpurl={httpurl}>{children}</RegisterApolloProvider>}

    </div>
  )
}

function Hello () {
  return (
    <Query
      query={helloQy}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>
        if (error) return <p>Error :(</p>
        return <div>Hello: <b>{data.hello}</b></div>
      }}
    </Query>
  )
}

function FizzBuzzClock () {
  return (
    <Subscription subscription={fizzBuzzSubscription}>
      {({ data, loading, error }) => {
      // {!error && !loading && JSON.stringify(data)}
        if (loading) return <p>Loading...</p>
        if (error) return <p>Error :(</p>
        if (!data || !data.newMessage) return <p>---</p>

        const { id, stamp, text } = data.newMessage
        return (
          <div>
            <span>Fizz|Buzz:</span>
            <pre style={{ display: 'inline' }}>
              <span><b>...{id.substr(-5)}</b> </span>
              <span><b>{stamp.substring(10, 19)}</b> </span>
              <span><b>{text}</b></span>
            </pre>
          </div>
        )
      }}
    </Subscription>
  )
}
