'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MUTATE_MESSAGE = exports.ON_NEW_MESSAGE_SUBSCRIPTION = exports.GET_MESSAGES_QUERY = undefined;

var _graphqlTag = require('graphql-tag');

var _graphqlTag2 = _interopRequireDefault(_graphqlTag);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const GET_MESSAGES_QUERY = exports.GET_MESSAGES_QUERY = _graphqlTag2.default`query {
  messages
}`; // gql is a transitive dependancy of apollo-client, apollo-link-core, and subscriptions-transport-ws
const ON_NEW_MESSAGE_SUBSCRIPTION = exports.ON_NEW_MESSAGE_SUBSCRIPTION = _graphqlTag2.default`
  subscription onNewMessage {
      newMessage
  }
`;

const MUTATE_MESSAGE = exports.MUTATE_MESSAGE = _graphqlTag2.default`
  mutation AddMessage($message: String!) {
      addMessage(message: $message)
  }
`;