// gql is a transitive dependancy of apollo-client, apollo-link-core, and subscriptions-transport-ws
const gql = require('graphql-tag')

module.exports = {
  GET_MESSAGES_QUERY: gql`
  query getAll {
    messages {
      id
      stamp
      host
      text
    }
  }`,

  ON_NEW_MESSAGE_SUBSCRIPTION: gql`
  subscription OnNewMessage {
    newMessage {
      id
      stamp
      host
      text
    }
  }`,

  MUTATE_MESSAGE: gql`
    mutation AddMessage($stamp: String!,$host: String!,$text: String!) {
      addMessage(message: {
        stamp: $stamp
        host: $host,
        text: $text
      }) {
        id
      }
    }`
}
