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

require("babel-polyfill");

// Create WebSocket server
const appWS = (0, _http.createServer)((request, response) => {
  response.writeHead(404);
  response.end();
});

const subscriptionServer = new _subscriptionsTransportWs.SubscriptionServer({
  onConnect: async (connectionParams, webSocket) => {
    console.log('WebSocket connection established');
    // the following object fields will be added to subscriptions context and filter methods
    return {
      authToken: connectionParams.authToken
    };
  },
  onUnsubscribe: (a, b) => {
    console.log('Unsubscribing');
  },
  onDisconnect: (a, b) => {
    console.log('Disconnecting');
  },
  subscriptionManager: _subscriptions.subscriptionManager
}, {
  server: appWS,
  path: '/'
});

appWS.listen(5000, () => {
  console.log(`Websocket listening on port 5000`);
});

// Init HTTP server and GraphQL Endpoints
const app = (0, _express2.default)();

app.use('*', (0, _cors2.default)());

app.use('/graphql', _bodyParser2.default.json(), (0, _graphqlServerExpress.graphqlExpress)(request => ({ schema: _subscriptions.schema, context: { authToken: parseInt(request.headers.authtoken) } })));

app.use('/graphiql', (0, _graphqlServerExpress.graphiqlExpress)({
  endpointURL: '/graphql',
  subscriptionsEndpoint: 'ws://localhost:5000/',
  query: 'query { messages }'
}));

app.listen(5060, () => {
  console.log(`Server listening on port 5060`);
});