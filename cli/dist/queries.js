'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MUTATE_MESSAGE = exports.ON_NEW_MESSAGE_SUBSCRIPTION = exports.GET_MESSAGES_QUERY = undefined;

var _templateObject = _taggedTemplateLiteral(['query {\n  messages\n}'], ['query {\n  messages\n}']),
    _templateObject2 = _taggedTemplateLiteral(['\n  subscription onNewMessage {\n      newMessage\n  }\n'], ['\n  subscription onNewMessage {\n      newMessage\n  }\n']),
    _templateObject3 = _taggedTemplateLiteral(['\n  mutation AddMessage($message: String!) {\n      addMessage(message: $message)\n  }\n'], ['\n  mutation AddMessage($message: String!) {\n      addMessage(message: $message)\n  }\n']);

var _graphqlTag = require('graphql-tag');

var _graphqlTag2 = _interopRequireDefault(_graphqlTag);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); } // gql is a transitive dependancy of apollo-client, apollo-link-core, and subscriptions-transport-ws


var GET_MESSAGES_QUERY = exports.GET_MESSAGES_QUERY = (0, _graphqlTag2.default)(_templateObject);

var ON_NEW_MESSAGE_SUBSCRIPTION = exports.ON_NEW_MESSAGE_SUBSCRIPTION = (0, _graphqlTag2.default)(_templateObject2);

var MUTATE_MESSAGE = exports.MUTATE_MESSAGE = (0, _graphqlTag2.default)(_templateObject3);