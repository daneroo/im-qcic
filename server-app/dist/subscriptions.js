"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolvers = exports.schema = exports.pubsub = exports.subscriptionManager = undefined;

var _graphqlSubscriptions = require("graphql-subscriptions");

var _graphqlTools = require("graphql-tools");

const pubsub = new _graphqlSubscriptions.PubSub();

// The DB
const messages = [];

const typeDefs = `
type Query {
  messages: [String!]!
}
type Mutation {
  addMessage(message: String!, broadcast: Boolean!): [String!]!
}
type Subscription {
  newMessage(userId: Int!): String!
}
`;

const resolvers = {
  Query: {
    messages(root, {}, context) {
      return messages;
    }
  },
  Mutation: {
    addMessage(root, { message, broadcast }, context) {
      let entry = JSON.stringify({ id: messages.length, message: message });
      messages.push(entry);
      pubsub.publish('newMessage', { entry: entry, authToken: context.authToken, broadcast });
      return messages;
    }
  },
  Subscription: {
    newMessage(message, variables, context, subscription) {
      console.log(`Serving subscription for user ${variables.userId}`);
      return message.entry;
    }
  }
};

const destinationFilter = (options, { filter }, subscriptionName) => ({
  // PubSub channel name (newMessage)
  ['newMessage']: {
    filter: (payload, context) => {
      if (payload.broadcast === true || payload.authToken === context.authToken) {
        return payload.entry;
      }
      return null;
    }
  }
});

const setupFunctions = {
  // The name of the subscription in our schema
  newMessage: destinationFilter
};

const schema = (0, _graphqlTools.makeExecutableSchema)({ typeDefs, resolvers });
const subscriptionManager = new _graphqlSubscriptions.SubscriptionManager({ schema, pubsub, setupFunctions });

exports.subscriptionManager = subscriptionManager;
exports.pubsub = pubsub;
exports.schema = schema;
exports.resolvers = resolvers;