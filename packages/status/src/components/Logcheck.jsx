
import React from 'react'

import { provenance, data } from '../../data/logcheck.json'
console.log(data)

export default function Logcheck({name='Dan-eroo2'}){

  return (<div>
    <h1>Hello, {name}</h1>
    <pre>{ JSON.stringify(provenance, null, 2) }</pre>
    <pre>{ JSON.stringify(data, null, 2) }</pre>
  </div>)
}