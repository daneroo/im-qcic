import { makeExecutableSchema } from "graphql-tools";
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

// The DB
const messages = [];

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
`;

const resolvers = {
  Query: {
    messages(root, { }, context) {
      return messages;
    }
  },
  Mutation: {
    addMessage(root, { message }, context) {
      // context authToken?, stamp?
      console.log('addMessage',message)
      messages.push(message);
      pubsub.publish('newMessage', message);
      return true;
    },
  },
  Subscription: {
    newMessage: {
      resolve: (payload, args, context, _info) => {
        console.log({payload,args,context})
        return payload;
      },
      subscribe: () => pubsub.asyncIterator('newMessage')
    }
  },
};
const schema = makeExecutableSchema({ typeDefs, resolvers });

setInterval(() => {
  const payload =  new Date().toISOString()
  console.log('publishing', payload)
  pubsub.publish('newMessage', payload);
}, 10000)

export { schema };