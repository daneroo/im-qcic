
import React from 'react'

import Table from './Table'
import {meta,data} from '../../data/logcheck.json'

function shorten(data){
  // header : col = col.split('.')[0]
  // Body
  // if (i==0) return str.substr(0,16)
  // return str.substr(0,7)
  return data.map((row,i)=>{
    if (i===0){ // header remove domain names
      return row.map((col,i)=>col.split('.')[0])
    }
    return row.map((col,j)=>{
      if (j==0) return col.substr(11,5)+'Z' // date (no day, no seconds)
      if (j>0) return col.substr(0,7)
      return col
    })
  })
}
export default function Logcheck(){
  return (
    <Table meta={meta} data={shorten(data)} />
  )
}
