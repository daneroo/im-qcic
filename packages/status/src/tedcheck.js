'use strict'

// dependencies - core-public-internal
const mysql = require('mysql')
const log = console
const config = require('./config')

const queries = {
  // concat(date,'') makes iso8601 like
  missingLastDay: 'select concat(DATE_SUB(NOW(), INTERVAL 24 HOUR),"") as since, round(avg(watt),0) as watt, count(*) as samples, 86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR)',
  missingWeekByDay: 'select concat(substring(stamp,1,11),"00:00:00") as day, round(avg(watt),0) as watt, count(*) as samples,86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 32 DAY) group by day having missing>-1',
  missingDayByHour: 'select concat(substring(stamp,1,14),"00:00") as hour, round(avg(watt),0) as watt, count(*) as samples,3600-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by hour having missing>-1'
  // missingDayByMinute: 'select concat(substring(stamp,1,17),"00") as minute, round(avg(watt),0) as watt, count(*) as samples,60-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by minute having missing>0'
}

exports = module.exports = {
  queries,
  asTable,
  exec,
  endConnection,
  iso8601ify
}

const connection = mysql.createConnection(config.mysql)

function asTable (data) {
  const table = []
  if (data.length) {
    const headers = Object.keys(data[0])
    table.push(headers)
    for (const row of data) {
      const tableRow = []
      for (const col of headers) {
        tableRow.push(row[col])
      }
      table.push(tableRow)
    }
  } else {
    log.warn('No data')
  }
  return table
}

// all first column are dates - skip header
function iso8601ify (data) {
  return data.map((row, i) => {
    if (i === 0) { // skip header
      return row
    }
    return row.map((col, j) => {
      // iso-ify first column
      if (j == 0) return col.replace(' ', 'T') + 'Z' // date (no day, no seconds)
      return col
    })
  })
}
async function exec (qy) {
  return new Promise((resolve, reject) => {
    // connection.connect()
    connection.query(qy, function (error, results, fields) {
      if (error) {
        // connection.end()
        reject(error)
        return
      }
      // connection.end()
      resolve(results)
    })
  })
}

function endConnection () {
  connection.end()
}
