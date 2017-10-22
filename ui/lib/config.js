
// const BASEURI = 'http://localhost:5000'
const BASEURI = 'https://gql-qcic.now.sh'
const WSBASEURI = BASEURI.replace(/^http/, 'ws')

export const uri = `${BASEURI}/graphql`;
export const wsuri = `${WSBASEURI}/subscriptions`;
