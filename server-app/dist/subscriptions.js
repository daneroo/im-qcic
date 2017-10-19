"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolvers = exports.schema = exports.pubsub = exports.subscriptionManager = undefined;

var _graphqlSubscriptions = require("graphql-subscriptions");

var _graphqlTools = require("graphql-tools");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _objectDestructuringEmpty(obj) { if (obj == null) throw new TypeError("Cannot destructure undefined"); }

var pubsub = new _graphqlSubscriptions.PubSub();

// The DB
var _messages = [];

var typeDefs = "\ntype Query {\n  messages: [String!]!\n}\ntype Mutation {\n  addMessage(message: String!, broadcast: Boolean!): [String!]!\n}\ntype Subscription {\n  newMessage(userId: Int!): String!\n}\n";

var resolvers = {
  Query: {
    messages: function messages(root, _ref, context) {
      _objectDestructuringEmpty(_ref);

      return _messages;
    }
  },
  Mutation: {
    addMessage: function addMessage(root, _ref2, context) {
      var message = _ref2.message,
          broadcast = _ref2.broadcast;

      var entry = JSON.stringify({ id: _messages.length, message: message });
      _messages.push(entry);
      pubsub.publish('newMessage', { entry: entry, authToken: context.authToken, broadcast: broadcast });
      return _messages;
    }
  },
  Subscription: {
    newMessage: function newMessage(message, variables, context, subscription) {
      console.log("Serving subscription for user " + variables.userId);
      return message.entry;
    }
  }
};

var destinationFilter = function destinationFilter(options, _ref3, subscriptionName) {
  var filter = _ref3.filter;
  return _defineProperty({}, 'newMessage', {
    filter: function filter(payload, context) {
      if (payload.broadcast === true || payload.authToken === context.authToken) {
        return payload.entry;
      }
      return null;
    }
  });
};

var setupFunctions = {
  // The name of the subscription in our schema
  newMessage: destinationFilter
};

var schema = (0, _graphqlTools.makeExecutableSchema)({ typeDefs: typeDefs, resolvers: resolvers });
var subscriptionManager = new _graphqlSubscriptions.SubscriptionManager({ schema: schema, pubsub: pubsub, setupFunctions: setupFunctions });

exports.subscriptionManager = subscriptionManager;
exports.pubsub = pubsub;
exports.schema = schema;
exports.resolvers = resolvers;