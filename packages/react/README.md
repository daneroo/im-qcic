# `@daneroo/qcic-react`

> QCIC Reusable React Components

[![NPM](https://img.shields.io/npm/v/@daneroo/qcic-react.svg)](https://www.npmjs.com/package/@daneroo/qcic-react) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @daneroo/qcic-react
```

## TODO

- _above is done
- use .jsx suffix
- replace eslint with standard
- testing

## Usage

From mdx-deck, `Counter` and `Fetch` are broken. Because of hooks?

```jsx
import React, { Component } from 'react'

import { Simple, Counter, FetchDate, Stringify, Fetch } from '@daneroo/qcic-react'

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

This was bootstraped from <https://github.com/transitive-bullshit/create-react-library>

Note: _Edit for lerna_

```bash
npx create-react-library
```

## License

MIT © [daneroo](https://github.com/daneroo)
