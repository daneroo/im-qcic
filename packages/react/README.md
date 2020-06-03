# `@daneroo/qcic-react`

QCIC Reusable React Components

[![NPM](https://img.shields.io/npm/v/@daneroo/qcic-react.svg)](https://www.npmjs.com/package/@daneroo/qcic-react) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

- These are packed with [@pika/pack]

## Install

```bash
npm install --save @daneroo/qcic-react
```

## TODO

- use .jsx suffix
- testing

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

- I replaced `eslint` with `standard`
- Also we had to add `--jsx React.createElement` to microbundle.

## License

MIT © [daneroo](https://github.com/daneroo)
