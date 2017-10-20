const BASEURI = process.env('BASEURI') || 'localhost:5000'
// const { BASEURI } = process.env

export default {
  uri: `https://${BASEURI}/graphql`,      // for http(s)://
  wsuri: `wss://${BASEURI}/subscriptions` // for ws://
}
