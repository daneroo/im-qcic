'use strict'

const config = require('./config')
const fs = require('fs')
const path = require('path')
const logcheck = require('./logcheck')
const log = console

const dataDir = './data'
const logheckFileName = path.join(`${dataDir}`, 'logcheck.json')

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
    // for (const row of data.slice(0, 5)) {
    //   console.log(row.join(' | '))
    // }
    await writeJSON(logheckFileName, { meta, data })
  }

  log.debug(JSON.stringify({ message: 'Scraping for docz::done', stamp }))
}

async function writeJSON (fileName, data) {
  log.debug(JSON.stringify({ message: 'Writing', fileName }))
  const dirName = path.dirname(fileName)
  try {
    log.debug(JSON.stringify({ message: 'mkdiur', dirName }))
    await fs.promises.mkdir(dirName)
  } catch (error) {
    if (error.code !== 'EEXIST') {
      log.error(error)
      process.exit(error.errno)
    }
  }
  try {
    return await fs.promises.writeFile(fileName, JSON.stringify(data))
  } catch (error) {
    log.error(error)
  }
}
