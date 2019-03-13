
import React from 'react'

import Table from './Table'

import {meta,data} from '../../data/tedcheck.json'

const tables = ["missingLastDay","missingWeekByDay","missingDayByHour"]

export default function Tedcheck(){
  return (
    <div>
      <Table meta={meta} data={data.missingLastDay} />
      <Table meta={meta} data={data.missingWeekByDay} />
      <Table meta={meta} data={data.missingDayByHour} />
    </div>
  )
}
