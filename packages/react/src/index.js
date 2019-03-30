import Fetch from './Fetch'
import FetchInterval from './FetchInterval'
import SetInterval from './SetInterval'
import Stringify from './Stringify'
import Welcome from './Welcome'

import { registerApolloClient, RegisterApolloProvider } from './gql'

export {
  Fetch, FetchInterval, SetInterval, Stringify, Welcome,
  registerApolloClient, RegisterApolloProvider
}

// alternative, more concise syntax for named exports
// export { default as Foo } from './Foo'

// or export default - probably not both...
// export default { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }
