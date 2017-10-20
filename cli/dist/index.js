'use strict';

var _net_interface = require('./net_interface');

var _net_interface2 = _interopRequireDefault(_net_interface);

require('isomorphic-fetch');

var _queries = require('./queries');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var myId = Math.random().toFixed(5).slice(2);
function newMessage() {
  return ['cli', myId, new Date().toISOString()].join(':');
}
function subscribe() {
  return _net_interface2.default.subscribe({
    query: _queries.ON_NEW_MESSAGE_SUBSCRIPTION
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
}
function query() {
  return _net_interface2.default.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: _queries.GET_MESSAGES_QUERY
  }).then(function (result) {
    console.log('query.last', result.data.messages.slice(-1));
  });
}

function mutate() {
  return _net_interface2.default.mutate({
    operationName: "AddMessage",
    mutation: _queries.MUTATE_MESSAGE,
    variables: { message: newMessage() }
  }).then(function (result) {
    console.log('mutate', result.data);
  });
}