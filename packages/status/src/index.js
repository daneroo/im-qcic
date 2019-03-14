'use strict'

const config = require('./config')
const fs = require('fs')
const path = require('path')
const logcheck = require('./logcheck')
const tedcheck = require('./tedcheck')
const log = console

const dataDir = './data'
const logheckFileName = path.join(`${dataDir}`, 'logcheck.json')
const tedcheckFileName = path.join(`${dataDir}`, 'tedcheck.json')

const verbose = false

main()

async function main () {
  const stamp = new Date().toISOString()

  log.debug(JSON.stringify({ message: 'Scraping for docz::start', stamp }))

  const { hostname, version } = config
  const metaBase = { stamp, hostname, version }

  {
    const meta = {
      ...metaBase,
      type: 'logcheck'
    }
    const data = await logcheck.asTable()
    showTable(data.slice(0, 3), 'Log Check')
    await writeJSON(logheckFileName, { meta, data })
  }
  {
    const meta = {
      ...metaBase,
      type: 'tedcheck'
    }
    const data = {}
    for (const qyName in tedcheck.queries) {
      log.info(JSON.stringify({ message: 'Fetching', qyName }))
      const qy = tedcheck.queries[qyName]
      data[qyName] = tedcheck.iso8601ify(tedcheck.asTable(await tedcheck.exec(qy)))
      showTable(data[qyName], qyName)
    }
    await writeJSON(tedcheckFileName, { meta, data })
    tedcheck.endConnection()
  }

  log.debug(JSON.stringify({ message: 'Scraping for docz::done', stamp }))
}

// for sql results
function showTable (data, title) {
  if (!verbose) return
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
  // log.debug(JSON.stringify({ message: 'Writing', fileName }))
  const dirName = path.dirname(fileName)
  try {
    // log.debug(JSON.stringify({ message: 'mkdir', dirName }))
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
