
import React from 'react'
import { Greeter, Welcome, Wilkomen } from '@daneroo/qcic-apollo-client-setup'

export default function External () {
  return (
    <div>
      <h4>Greeter: {Greeter('Dan-da-man')}</h4>
      <Welcome />
      <Wilkomen />
    </div>
  )
}
