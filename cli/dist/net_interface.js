"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.authToken = exports.default = undefined;

var _apolloClient = require("apollo-client");

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _subscriptionsTransportWs = require("subscriptions-transport-ws");

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var authToken = Math.floor(Math.random() * 100000000 + 1);

// Subscriptions - Create WebSocket client
var wsClient = new _subscriptionsTransportWs.SubscriptionClient(_config2.default.wsuri, {
  reconnect: true,
  connectionParams: {
    authToken: authToken
  }
}, _ws2.default);

var authTokenMiddleware = {
  applyMiddleware: function applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};
    }
    req.options.headers['authToken'] = authToken;
    next();
  }
};

var networkInterface = (0, _subscriptionsTransportWs.addGraphQLSubscriptions)((0, _apolloClient.createNetworkInterface)({
  uri: _config2.default.uri
}), wsClient);

networkInterface.use([authTokenMiddleware]);

var client = new _apolloClient.ApolloClient({ networkInterface: networkInterface });

exports.default = client;
exports.authToken = authToken;