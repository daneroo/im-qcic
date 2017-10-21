'use strict';

const PORT = 5000;

// For now the ws baseURI is derived from BASEURI
// because we deploy on same host:port
// BASEURI Has to be explicit, until we fix the graphiqlExpress
// - consider using only websockets..
const BASEURI = process.env['BASEURI'] || `http://localhost:${PORT}`;
const WSBASEURI = process.env['WSBASEURI'] || BASEURI.replace(/^http/, 'ws');

// export default {
module.exports = {
  PORT,
  BASEURI,
  WSBASEURI
};

console.log('Config:', JSON.stringify(module.exports, null, 2));