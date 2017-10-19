'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schema = undefined;

var _graphqlTools = require('graphql-tools');

var _graphqlSubscriptions = require('graphql-subscriptions');

function _objectDestructuringEmpty(obj) { if (obj == null) throw new TypeError("Cannot destructure undefined"); }

var pubsub = new _graphqlSubscriptions.PubSub();

// The DB
var _messages = [];

var typeDefs = '\ntype Query {\n  messages: [String!]!\n}\ntype Mutation {\n  addMessage(message: String!): Boolean!\n}\ntype Subscription {\n  newMessage: String\n}\n';

var resolvers = {
  Query: {
    messages: function messages(root, _ref, context) {
      _objectDestructuringEmpty(_ref);

      return _messages;
    }
  },
  Mutation: {
    addMessage: function addMessage(root, _ref2, context) {
      var message = _ref2.message;

      // context authToken?, stamp?
      console.log('addMessage', message);
      _messages.push(message);
      pubsub.publish('newMessage', message);
      return true;
    }
  },
  Subscription: {
    newMessage: {
      resolve: function resolve(payload, args, context, _info) {
        console.log({ payload: payload, args: args, context: context });
        return payload;
      },
      subscribe: function subscribe() {
        return pubsub.asyncIterator('newMessage');
      }
    }
  }
};
var schema = (0, _graphqlTools.makeExecutableSchema)({ typeDefs: typeDefs, resolvers: resolvers });

setInterval(function () {
  var payload = new Date().toISOString();
  console.log('publishing', payload);
  pubsub.publish('newMessage', payload);
}, 10000);

exports.schema = schema;