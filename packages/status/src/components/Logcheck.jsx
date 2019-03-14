
import React from 'react'
import { Table, map2d} from './Table'
import { meta, data } from '../../data/logcheck.json'
import {df} from './df'

function shorten(i,j,v){
  if (i===0){ // header remove domain names
    return v.split('.')[0]
  }
  if (j==0) return df(v) // date (no day, no seconds)
  if (j>0) return v.substr(0,7)
  return v
}

export default function Logcheck(){
  return (
    <Table meta={meta} data={data} mapper={shorten} />
  )
}
