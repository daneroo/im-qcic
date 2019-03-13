'use strict'

// dependencies - core-public-internal
const mysql = require('mysql')
// const log = console
const config = require('./config')

const queries = {
  // concat(date,'') makes iso8601 like
  missingLastDay: 'select concat(DATE_SUB(NOW(), INTERVAL 24 HOUR),"") as since, count(*) as samples, 86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR)',
  missingWeekByDay: 'select concat(substring(stamp,1,11),"00:00:00") as day, round(avg(watt),0) as watt, count(*) as samples,86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 7 DAY) group by day having missing>0',
  missingDayByHour: 'select concat(substring(stamp,1,14),"00:00") as hour, round(avg(watt),0) as watt, count(*) as samples,3600-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by hour having missing>0'
  // missingDayByMinute: 'select concat(substring(stamp,1,17),"00") as minute, round(avg(watt),0) as watt, count(*) as samples,60-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by minute having missing>0'
}

exports = module.exports = {
  queries,
  asTable,
  exec,
  endConnection
}

const connection = mysql.createConnection(config.mysql)

const log = console
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
