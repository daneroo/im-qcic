# `@daneroo/qcic-react`

QCIC Reusable React Components and Hooks

[![NPM](https://img.shields.io/npm/v/@daneroo/qcic-react.svg)](https://www.npmjs.com/package/@daneroo/qcic-react) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

- These are packed with [@pika/pack]
- `.babelrc` is still required along with: `npm i -D @babel/preset-env @babel/preset-react`

## Install

```bash
npm install --save @daneroo/qcic-react
```

## TODO

- remove axios from peerDeps and implementation
- testing/replace fetch (hook?)
  - <https://medium.com/@doppelmutzi/testing-of-a-custom-react-hook-for-fetching-data-with-axios-26f012948a8f>
  - <https://github.com/stevenpersia/captain-hook/blob/master/useFetch.js>
  - <https://www.npmjs.com/package/jest-fetch-mock>
- see <https://www.npmjs.com/package/axios-hooks> for something better?

## Usage

From mdx-deck, `Counter` and `Fetch` are broken. Because of hooks?

```jsx
import React, { Component } from 'react'

import { Counter, Fetch, FetchDate, Simple, Stringify, Welcome  } from '@daneroo/qcic-react'

export default function Combined () {
  return (<div>
      <Welcome name="Dan-o-rama"/>
      <Simple text="Dan-eroo"/>
      <FetchDate text="Dan-eroo"/>
      <Counter initialCount={42} />
      <Stringify data={[1,{middle:'thing'},3]} />
      <Fetch url="https://time.qcic.n.imetrical.com" poll={true} delay={2000}>
        <Stringify />
      </Fetch>
  </div>)
}
```

## Setup

This was inspired by the build from <https://github.com/donavon/use-persisted-state>

- I replaced `eslint` with `standard`, and `microbundle` with `@pika/pack`

## Mocking

Some of these tests are fetching external resources (e.g. <https://time.qcic.n.imetrical.com>), so we are now mocking the global `fecth` for jest tests. (This replaces a runtime dependency on axios)

```bash
npm install --save-dev jest-fetch-mock
```

And instrument a single test file with:

```js
import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks()
```

## License

MIT © [daneroo](https://github.com/daneroo)
