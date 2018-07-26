
// const BASEURI = 'http://localhost:5000'
const BASEURI = 'https://api.qcic.n.imetrical.com'
const WSBASEURI = BASEURI.replace(/^http/, 'ws')

export const uri = `${BASEURI}/graphql`
export const wsuri = `${WSBASEURI}/graphql`
