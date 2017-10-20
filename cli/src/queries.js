// gql is a transitive dependancy of apollo-client, apollo-link-core, and subscriptions-transport-ws
import gql from 'graphql-tag'

export const GET_MESSAGES_QUERY = gql`query {
  messages
}`

export const ON_NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription onNewMessage {
      newMessage
  }
`

export const MUTATE_MESSAGE = gql`
  mutation AddMessage($message: String!) {
      addMessage(message: $message)
  }
`
