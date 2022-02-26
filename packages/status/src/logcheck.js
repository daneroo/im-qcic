'use strict'

// stolen from scrobbleCast/js/lib/logcheck.js
// This abstracts querying the loggly endpoint
// this allows us to coordinate/and compare the logging output from many running clients

// The first use case is to pull the end of job logs on all nodes (md5 after dedup)
// A second check could be that rollup has been run for the current month.

// Uses native Promise

// dependencies - core-public-internal
const loggly = require('loggly')
const log = require('./log')
const config = require('./config')

exports = module.exports = {
  // TODO(daneroo): add tests
  asTable,
  getCheckpointRecords,
  // below are Tested
  // exposed for testing
  parseCheckpointEvents,
  round10min,
  shortDate,
  shortHash,
  shorten,
  aggregate
}

async function asTable () {
  const data = await getCheckpointRecords()
  return aggregate(data)
}

//  return an array of {}
async function getCheckpointRecords () {
  // The search options can be parametrized later (hours,runs...)
  const searchOptions = {
    query: 'tag:pocketscrape AND json.message:checkpoint AND json.scope:item AND json.digest:*',
    from: '-24h',
    until: 'now',
    order: 'desc', // which is the default
    // max size is about 1728=12*24*6, entiresPerRun*24h(retention) * 6runs/hour
    // at 12 entries per task run: 2 type * 2 users * 3 hosts, so this is 36 runs, or 6 hours.
    size: 200
  }

  const events = await queryLoggly(searchOptions)
  return parseCheckpointEvents(events)
}

// receives loggly events for checkpoint.
// depends on events having {timestamp,tags:['host-,..],event.json.digest}
// and returns an array of {stamp,host,digest}
function parseCheckpointEvents (events) {
  const records = []

  events.forEach(function (event) {
    // log.debug('event', event)
    // stamp is no longer rounded here: moved to aggregator function
    const stamp = new Date(event.timestamp).toJSON()

    // host from tags: [ 'pocketscrape', 'host-darwin.imetrical.com' ]
    const hostRE = /^host-/
    const defaultHost = 'unknown'
    // return the last matching host, with suitable default
    const host = event.tags.reduce((host, tag) => tag.match(hostRE) ? tag.replace(hostRE, '') : host, defaultHost)

    // skip if event.event.json.digest not found
    if (event.event && event.event.json && event.event.json.digest) {
      const digest = event.event.json.digest

      const record = {
        stamp: stamp,
        host: host,
        digest: digest
      }

      records.push(record)
    }
  })
  return records
}

// This function uses the node-loggly module directly, instead of winston-loggly
// This makes this module more independent.
async function queryLoggly (searchOptions) {
  return new Promise(function (resolve, reject) {
    const client = loggly.createClient(config.loggly)
    client.search(searchOptions)
      .run(function (err, results) {
        if (err) {
          // the error object doesn't work with loggly, convert to string to send
          log.error('logcheck.query: %s', err)
          reject(err)
        } else {
          log.debug({
            fetched: results.events.length,
            total_events: results.total_events
          }, 'logcheck.query')
          resolve(results.events)
        }
      })
  })
}

// --- utilities

function round10min (stamp) {
  return stamp.replace(/[0-9]:[0-9]{2}(\.[0-9]*)?Z$/, '0:00Z') // round down to 10:00
}

function shortDate (stampStr) {
  return stampStr.substr(11, 9)
}

function shortHash (hash) {
  return hash.substr(0, 7)
}

function shorten (long) {
  const short = [long[0]] // dont touch titles
  for (const digests of long.slice(1)) {
    const row = [shortDate(digests[0])] // which os a date
    for (const d of digests.slice(1)) {
      row.push(shortHash(d))
    }
    short.push(row)
  }
  return short
}

function aggregate (data) {
  // pre-sort in ascending date order
  data = data.slice() // clone incoming
  data.sort((a, b) => a.stamp.localeCompare(b.stamp))

  // reduce set of {stamp,host,digest} -> 10min(stamp)->{[host]=>digest}
  // '2019-03-11T19:00:00Z': { h1:d1, h2,d2,.. },
  const digestByStampByHost = data.reduce((map, entry) => {
    const stamp = round10min(entry.stamp)
    const { host, digest } = entry
    // TODO(daneroo) if already present select max date, but it is too late..
    //  Just make sure the original entries are ascending in date...
    map[stamp] = { ...(map[stamp] || {}), [host]: digest }
    return map
  }, {})

  const hosts = Array.from(
    Object.values(digestByStampByHost).reduce((set, digestByHost) => {
      Object.keys(digestByHost).reduce((set, host) => {
        return set.add(host)
      }, set)
      return set
    }, new Set())
  )
  hosts.sort()

  const stamps = Object.keys(digestByStampByHost).sort().reverse()

  // host + [stamp, digest1, digest 2,..]*
  const result = [['checkpoint', ...hosts]]

  for (const stamp of stamps) {
    const ds = [stamp]
    for (const host of hosts) {
      const d = (digestByStampByHost[stamp][host] || '')
      ds.push(d)
    }
    result.push(ds)
  }

  return result
}
