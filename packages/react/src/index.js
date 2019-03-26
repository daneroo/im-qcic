import Simple from './Simple'
import Counter from './Counter'
import Fetch from './Fetch'
import FetchDate from './FetchDate'
import Stringify from './Stringify'
import Welcome from './Welcome'

// export Foo and Bar as named exports
export { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }

// alternative, more concise syntax for named exports
// export { default as Foo } from './Foo'

// you can optionally also set a default export for your module
export default { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }
