
import React from 'react'
import gql from 'graphql-tag'
import { ApolloProvider, Query, Subscription } from 'react-apollo'
import newApolloClient from './apollo'

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

function Test ({ httpurl = 'https://fizzbuzzclock.n.imetrical.com/graphql' }) {
  const client = newApolloClient(httpurl)

  return <div>
    <h4>GraphQL Endpoint => {httpurl}</h4>
    <ApolloProvider client={client}>
      <Hello />
      <FizzBuzzClock />
    </ApolloProvider>
  </div>
}
export default Test

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
