"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.authToken = exports.default = undefined;

var _reactApollo = require("react-apollo");

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _subscriptionsTransportWs = require("subscriptions-transport-ws");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uri = 'http://localhost:5000/graphql';

var authToken = Math.floor(Math.random() * 100000000 + 1);

// Subscriptions - Create WebSocket client
var wsClient = new _subscriptionsTransportWs.SubscriptionClient('ws://localhost:5000/subscriptions', {
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

var networkInterface = (0, _subscriptionsTransportWs.addGraphQLSubscriptions)((0, _reactApollo.createNetworkInterface)({ uri: uri }), wsClient);
networkInterface.use([authTokenMiddleware]);

var client = new _reactApollo.ApolloClient({ networkInterface: networkInterface });

exports.default = client;
exports.authToken = authToken;