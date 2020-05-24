const BASEURI = 'https://natsql.dl.imetrical.com'
const WSBASEURI = BASEURI.replace(/^http/, 'ws')

export const uri = `${BASEURI}/graphql`
export const wsuri = `${WSBASEURI}/graphql`
