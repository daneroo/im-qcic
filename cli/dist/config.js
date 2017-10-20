'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// const BASE = 'localhost:5000'
const BASE = 'sub-server-hkaazjvfrq.now.sh';

exports.default = {
  uri: `https://${BASE}/graphql`, // for http(s)://
  wsuri: `wss://${BASE}/subscriptions` // for ws://
};