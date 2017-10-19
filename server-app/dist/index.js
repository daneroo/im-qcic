"use strict";

var _http = require("http");

var _subscriptionsTransportWs = require("subscriptions-transport-ws");

var _graphqlServerExpress = require("graphql-server-express");

var _subscriptions = require("./subscriptions");

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _cors = require("cors");

var _cors2 = _interopRequireDefault(_cors);

var _bodyParser = require("body-parser");

var _bodyParser2 = _interopRequireDefault(_bodyParser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require("babel-polyfill");

// Create WebSocket server
var appWS = (0, _http.createServer)(function (request, response) {
  response.writeHead(404);
  response.end();
});

var subscriptionServer = new _subscriptionsTransportWs.SubscriptionServer({
  onConnect: function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(connectionParams, webSocket) {
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              console.log('WebSocket connection established');
              // the following object fields will be added to subscriptions context and filter methods
              return _context.abrupt("return", {
                authToken: connectionParams.authToken
              });

            case 2:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function onConnect(_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }(),
  onUnsubscribe: function onUnsubscribe(a, b) {
    console.log('Unsubscribing');
  },
  onDisconnect: function onDisconnect(a, b) {
    console.log('Disconnecting');
  },
  subscriptionManager: _subscriptions.subscriptionManager
}, {
  server: appWS,
  path: '/'
});

appWS.listen(5000, function () {
  console.log("Websocket listening on port 5000");
});

// Init HTTP server and GraphQL Endpoints
var app = (0, _express2.default)();

app.use('*', (0, _cors2.default)());

app.use('/graphql', _bodyParser2.default.json(), (0, _graphqlServerExpress.graphqlExpress)(function (request) {
  return { schema: _subscriptions.schema, context: { authToken: parseInt(request.headers.authtoken) } };
}));

app.use('/graphiql', (0, _graphqlServerExpress.graphiqlExpress)({
  endpointURL: '/graphql',
  subscriptionsEndpoint: 'ws://localhost:5000/',
  query: 'query { messages }'
}));

app.listen(5060, function () {
  console.log("Server listening on port 5060");
});