import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import cors from "cors";

import { schema } from './my-schema';


const PORT = 5000;
const app = express();
app.use('*', cors());
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));
app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
}));

const server = createServer(app);
server.listen(PORT, () => {
    new SubscriptionServer({
      execute,
      subscribe,
      schema,
    }, {
      server: server,
      path: '/subscriptions',
    });
});

