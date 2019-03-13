
import React from 'react'

export default function Table({meta,data}){
  return (
    <table style={{textAlign:'center',fontSize:'100%'}}>
      <Header row={data[0]} />
      <tbody>
      {data.slice(1,8).map((row,i) => {   
        return(<Body key={i} row={row} />)
      })}
      </tbody>

    </table>)
}

function Header({row}){
  return <thead><tr>{
    row.map((col,i)=><th key={i}>{col}</th>)
  }</tr></thead>
}

function Body({row}){
  return <tr>{
    row.map((col,i)=><td key={i}>{col}</td>)
  }</tr>
}
