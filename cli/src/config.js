const BASEURI = process.env['BASEURI'] || 'localhost:5000'
// const { BASEURI } = process.env

export default {
  uri: `http://${BASEURI}/graphql`,      // for http(s)://
  wsuri: `ws://${BASEURI}/subscriptions` // for ws://
}
