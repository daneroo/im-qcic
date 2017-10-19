"use strict";

var _templateObject = _taggedTemplateLiteral(["query {\n  messages\n}"], ["query {\n  messages\n}"]),
    _templateObject2 = _taggedTemplateLiteral(["\n  subscription onNewMessage {\n      newMessage\n  }\n"], ["\n  subscription onNewMessage {\n      newMessage\n  }\n"]),
    _templateObject3 = _taggedTemplateLiteral(["\n  mutation AddMessage($message: String!) {\n      addMessage(message: $message)\n  }\n"], ["\n  mutation AddMessage($message: String!) {\n      addMessage(message: $message)\n  }\n"]);

var _net_interface = require("./net_interface");

var _net_interface2 = _interopRequireDefault(_net_interface);

var _reactApollo = require("react-apollo");

require("isomorphic-fetch");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

console.log('hello cli');

var GET_MESSAGES_QUERY = (0, _reactApollo.gql)(_templateObject);

var ON_NEW_MESSAGE_SUBSCRIPTION = (0, _reactApollo.gql)(_templateObject2);

var MUTATE_MESSAGE = (0, _reactApollo.gql)(_templateObject3);

main();
function main() {
  setInterval(function () {
    console.log('subscribing');
    var subscriptionObserver = subscribe();
    setTimeout(function () {
      console.log('unsubscribing');
      subscriptionObserver.unsubscribe();
    }, 10000);
  }, 20000);
  setInterval(function () {
    Promise.resolve()
    // .then(query)
    .then(mutate).then(query);
  }, 2000);
}

function subscribe() {
  // later:   subscriptionObserver.unsubscribe()
  var subscriptionObserver = _net_interface2.default.subscribe({
    query: ON_NEW_MESSAGE_SUBSCRIPTION
    // variables: { repoFullName: repoName },
  }).subscribe({
    next: function next(data) {
      console.log('sub.data', data);
    },
    error: function error(err) {
      console.error('sub.err', err);
    },
    complete: function complete() {
      console.log('sub.complete');
    }
  });
  return subscriptionObserver;
}
function query() {
  return _net_interface2.default.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: GET_MESSAGES_QUERY
  }).then(function (result) {
    console.log('query.last', result.data.messages.slice(-1));
  });
}

function mutate() {
  return _net_interface2.default.mutate({
    operationName: "AddMessage",
    mutation: MUTATE_MESSAGE,
    variables: { message: 'cli:' + new Date().toISOString() }
  }).then(function (result) {
    console.log('mutate', result.data);
  });
}