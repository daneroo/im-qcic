import { ApolloClient, createNetworkInterface } from "react-apollo";
import { addGraphQLSubscriptions, SubscriptionClient } from "subscriptions-transport-ws";

// const BASEURI = 'http://localhost:5000'
const BASEURI = 'https://api-qcic.now.sh'
const WSBASEURI = BASEURI.replace(/^http/, 'ws')

const uri = `${BASEURI}/graphql`;
const wsuri = `${WSBASEURI}/subscriptions`;

const authToken = Math.floor((Math.random() * 100000000) + 1);

// Subscriptions - Create WebSocket client
const wsClient = new SubscriptionClient(wsuri, {
  reconnect: true,
  connectionParams: {
    authToken: authToken
  }
});

const authTokenMiddleware = {
  applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};
    }
    req.options.headers['authToken'] = authToken;
    next();
  }
};

let networkInterface = addGraphQLSubscriptions(createNetworkInterface({uri}), wsClient);
networkInterface.use([authTokenMiddleware]);

const client = new ApolloClient({networkInterface});

export { client as default, authToken };