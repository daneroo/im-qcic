import { registerApolloClient } from './apollo-client'
import { RegisterApolloProvider } from './RegisterApolloProvider'

export { registerApolloClient, RegisterApolloProvider }

// alternative, more concise syntax for named exports
// export { default as Foo } from './Foo'

// or export default - probably not both...
// export default { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }
