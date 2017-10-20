import { makeExecutableSchema } from 'graphql-tools'
import { PubSub } from 'graphql-subscriptions'

const pubsub = new PubSub()

// The DB
const messages = []
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
type Query {
  messages: [String!]!
}
type Mutation {
  addMessage(message: String!): Boolean!
}
type Subscription {
  newMessage: String
}
`

const resolvers = {
  Query: {
    messages (root, { }, context) {
      return messages
    }
  },
  Mutation: {
    addMessage (root, { message }, context) {
      // context authToken?, stamp?
      console.log('addMessage', message)
      saveMessageAndTrim(message)
      pubsub.publish('newMessage', message)
      return true
    }
  },
  Subscription: {
    newMessage: {
      // resolve: (payload, args, context, _info) => {
      //   console.log({payload, args, context})
      //   return payload
      // },
      subscribe: () => pubsub.asyncIterator('newMessage')
    }
  }
}
const schema = makeExecutableSchema({ typeDefs, resolvers })

setInterval(() => {
  const payload = 'srv:0:' + new Date().toISOString()
  console.log('publishing', payload)
  pubsub.publish('newMessage', payload)
}, 10000)

export { schema }
