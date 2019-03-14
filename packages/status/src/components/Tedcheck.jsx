
import React from 'react'
import {Table} from './Table'
import {meta,data} from '../../data/tedcheck.json'
import {df} from './df'

function shorten(i,j,v){
  if (i>0 && j==0) return df(v,'YYYY-MM-DD HH:mm') // date (no day, no seconds)
  return v
}

export default function Tedcheck(){
  return (
    <div>
      <Table meta={meta} data={data.missingLastDay} mapper={shorten}/>
      <Table meta={meta} data={data.missingWeekByDay} mapper={shorten}/>
      <Table meta={meta} data={data.missingDayByHour} mapper={shorten}/>
    </div>
  )
}
