//  Replaces App component
// applies global styles, that are 
//  - not in _document.js
//  - not in withRoot wrapper

import withRoot from '../lib/withMaterialRoot';

export default withRoot(({ children }) => (
  <main>
    {children}
    {/* Global style for all <Page /> elements, this is applied to late!!! */}
    {/* Moved to global in withRoot */}
  </main>
))
