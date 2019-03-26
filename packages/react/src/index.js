import Simple from './Simple'
import Counter from './Counter'
import Fetch from './Fetch'
import FetchDate from './FetchDate'
import Stringify from './Stringify'
import Welcome from './Welcome'

export { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }

// alternative, more concise syntax for named exports
// export { default as Foo } from './Foo'

export default { Simple, Counter, Fetch, FetchDate, Stringify, Welcome }
