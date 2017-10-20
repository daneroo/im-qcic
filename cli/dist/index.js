'use strict';

var _net_interface = require('./net_interface');

var _net_interface2 = _interopRequireDefault(_net_interface);

require('isomorphic-fetch');

var _queries = require('./queries');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

main();
function main() {
  setInterval(() => {
    console.log('subscribing');
    const subscriptionObserver = subscribe();
    setTimeout(() => {
      console.log('unsubscribing');
      subscriptionObserver.unsubscribe();
    }, 10000);
  }, 20000);
  setInterval(() => {
    Promise.resolve()
    // .then(query)
    .then(mutate).then(query);
  }, 2000);
}

const myId = Math.random().toFixed(5).slice(2);
function newMessage() {
  return ['cli', myId, new Date().toISOString()].join(':');
}
function subscribe() {
  return _net_interface2.default.subscribe({
    query: _queries.ON_NEW_MESSAGE_SUBSCRIPTION
    // variables: { repoFullName: repoName },
  }).subscribe({
    next(data) {
      console.log('sub.data', data);
    },
    error(err) {
      console.error('sub.err', err);
    },
    complete() {
      console.log('sub.complete');
    }
  });
}
function query() {
  return _net_interface2.default.query({
    fetchPolicy: 'network-only', // "cache-first" | "cache-and-network" | "network-only" | "cache-only" | "standby"
    query: _queries.GET_MESSAGES_QUERY
  }).then(result => {
    console.log('query.last', result.data.messages.slice(-1));
  });
}

function mutate() {
  return _net_interface2.default.mutate({
    operationName: 'AddMessage',
    mutation: _queries.MUTATE_MESSAGE,
    variables: { message: newMessage() }
  }).then(result => {
    console.log('mutate', result.data);
  });
}