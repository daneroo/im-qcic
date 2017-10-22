const { makeExecutableSchema } = require('graphql-tools')
const { PubSub } = require('graphql-subscriptions')
const ulid = require('ulid')

const pubsub = new PubSub()

// The DB
const messages = [{
  id: ulid(0),
  stamp: '1970T00:00:00.000Z',
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

const typeDefs = `
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
      saveMessageAndTrim(message)
      pubsub.publish('newMessage', message)
      return message
    }
  },
  Subscription: {
    newMessage: {
      resolve: (payload, args, context, _info) => {
        // console.log({payload, args, context})
        return payload
      },
      subscribe: () => pubsub.asyncIterator('newMessage')
    }
  }
}
const schema = makeExecutableSchema({ typeDefs, resolvers })

setInterval(() => {
  const message = {
    id: ulid(),
    stamp: new Date().toISOString(),
    host: 'gql',
    text: 'hello'
  }
  saveMessageAndTrim(message)
  console.log('publishing', message)
  const t = ulid.decodeTime(message.id)
  console.log('ulid.decodeTime(id)', t, new Date(t))

  pubsub.publish('newMessage', message)
}, 10000)

module.exports = { schema }
