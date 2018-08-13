const { PubSub, gql } = require('apollo-server')

const pubsub = new PubSub()

const ulid = require('ulid').ulid

let natsPublish = null
function setNatsPublish (publish) {
  natsPublish = publish
}

// The DB
const messages = [{
  id: ulid(0),
  stamp: '1970-01-01T00:00:00.000Z',
  host: 'origin',
  text: 'In the begining'
}]
const messagesToKeep = 10
function saveMessageAndTrim (message) {
  // append
  messages.push(message)
  // console.log(`- |messages|=${messages.length}`)
  // remove fro the head
  while (messages.length > messagesToKeep) {
    // should I publish this removal?
    messages.shift()
  }
  // console.log(`+ |messages|=${messages.length}`)
}

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
  # Comments in GraphQL are defined with the hash (#) symbol.
  input MessageInput {
    stamp: String!
    host: String!
    text: String!
  }

  type Message {
    id: ID!
    stamp: String!
    host: String!
    text: String!
  }

  type Query {
    messages: [Message]
  }
  type Mutation {
    addMessage(message: MessageInput): Message
  }
  type Subscription {
    newMessage: Message
  }
`

const MESSAGE_ADDED = 'MESSAGE_ADDED'

const resolvers = {
  Query: {
    messages (root, { _noargs }, context) {
      return messages
    }
  },
  Mutation: {
    addMessage (root, { message }, context) {
      // context authToken?, stamp?
      console.log('addMessage', message)
      message.id = ulid()
      // refactor this...
      // publishInternal(message, true)
      if (natsPublish) {
        natsPublish(message.text)
      }
      return message
    }
  },
  Subscription: {
    newMessage: {
      resolve: (payload, args, context, _info) => {
        // console.log({payload, args, context})
        return payload
      },
      subscribe: () => pubsub.asyncIterator([MESSAGE_ADDED])
    }
  }
}

function publishInternal (message, bridge) {
  saveMessageAndTrim(message)
  pubsub.publish(MESSAGE_ADDED, message)
}

function publishToGQL (message) {
  publishInternal(message, false)
}

module.exports = { typeDefs, resolvers, publishToGQL, setNatsPublish }
