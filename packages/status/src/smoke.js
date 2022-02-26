'use strict'

const config = require('./config')
const fs = require('fs')
const path = require('path')
const logcheck = require('./logcheck')
const mysql = require('mysql2/promise')
const tedcheck = require('./tedcheck')
const log = require('./log')

const dataDir = './dist'
const logcheckFileName = path.join(`${dataDir}`, 'logcheck.json')
const tedcheckFileName = path.join(`${dataDir}`, 'tedcheck.json')

const verbose = true
log.level = 'debug' // default is info

main()

async function main () {
  const stamp = new Date().toISOString()

  log.info({ stamp }, `Smoke::start for ${config.version.name}`)

  const { hostname, version } = config
  const metaBase = { stamp, hostname, version }

  {
    const meta = {
      ...metaBase,
      type: 'logcheck'
    }
    const data = await logcheck.asTable()
    showTable(data.slice(0, 3), 'Log Check')
    await writeJSON(logcheckFileName, { meta, data })
  }
  {
    const meta = {
      ...metaBase,
      type: 'tedcheck'
    }
    const connection = await mysql.createConnection(config.mysql)

    const data = {}
    for (const qyName in tedcheck.queries) {
      log.info({ qyName }, 'Fetching')
      const qy = tedcheck.queries[qyName]
      data[qyName] = tedcheck.iso8601ify(tedcheck.asTable(await tedcheck.query(connection, qy)))
      showTable(data[qyName], qyName)
    }
    await writeJSON(tedcheckFileName, { meta, data })
    connection.end()
  }
  const elapsed = ((+new Date() - new Date(stamp)) / 1000).toFixed(1)
  log.info({ stamp, elapsed }, `Smoke::done for ${config.version.name}`)
}

// for sql results
function showTable (data, title) {
  if (data) {
    log.info(`-= ${title} (${data.length})`)
    for (const row of data) {
      log.info(row.join(' | '))
    }
  }
  if (!data || data.length < 2) {
    log.warn(`-= ${title} No data`)
  }
}

async function writeJSON (fileName, data) {
  const dirName = path.dirname(fileName)
  try {
    await fs.promises.mkdir(dirName)
  } catch (error) {
    if (error.code !== 'EEXIST') {
      log.error(error)
      process.exit(error.errno)
    }
  }
  try {
    await fs.promises.writeFile(fileName, JSON.stringify(data))
    log.info(JSON.stringify({ message: 'Wrote', fileName }))
  } catch (error) {
    log.error(error)
  }
}
