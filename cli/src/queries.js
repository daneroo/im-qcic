// gql is a transitive dependancy of apollo-client, apollo-link-core, and subscriptions-transport-ws
const gql = require('graphql-tag')

module.exports = {
  GET_MESSAGES_QUERY: gql`query {
    messages
  }`,

  ON_NEW_MESSAGE_SUBSCRIPTION: gql`
    subscription onNewMessage {
        newMessage
    }
  `,

  MUTATE_MESSAGE: gql`
    mutation AddMessage($message: String!) {
        addMessage(message: $message)
    }
  `
}
