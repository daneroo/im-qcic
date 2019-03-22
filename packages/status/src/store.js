
// dependencies - core-public-internal
const log = console
const { Pool } = require('pg')
const { getCheckpointRecords } = require('./logcheck')
const config = require('./config')

exports = module.exports = {
  ddl,
  hello,
  end
}

const ddls = [
  `CREATE TABLE IF NOT EXISTS heartbeat (
    stamp timestamp(0) PRIMARY KEY,
    message varchar(255)
  );`,
  `CREATE TABLE IF NOT EXISTS logcheck (
    stamp timestamp(0),
    host varchar(255),
    digest varchar(64),
    PRIMARY KEY ( stamp, host )
  );`

]

const pool = new Pool(config.postgres)

async function ddl () {
  try {
    for (const ddl of ddls) {
      // log.info(ddl)
      const res = await pool.query(ddl)
      log.info(res.command, 'OK')
    }
  } catch (err) {
    log.error(err)
  }
}

async function end () {
  return pool.end()
}

async function scrapeScrobbleCastLogcheck () {
  const sql = 'INSERT INTO logcheck(stamp,host,digest) VALUES($1, $2, $3) ON CONFLICT DO NOTHING'

  const rs = await getCheckpointRecords()
  // log.info(JSON.stringify(rs, null, 2))
  let rowCount = 0
  for (const r of rs) {
    const values = [r.stamp, r.host, r.digest]
    try {
      const res = await pool.query(sql, values)
      // console.log(res.command, res.rowCount)
      rowCount += res.rowCount
    } catch (err) {
      console.log(err.stack)
    }
  }
  console.log(`Inserted ${rowCount} of ${rs.length}`)
}

async function heartbeat () {
  const sql = 'INSERT INTO heartbeat(stamp,message) VALUES($1, $2) RETURNING *'
  const values = [new Date(), 'heartbeat']

  try {
    const res = await pool.query(sql, values)
    console.log(res.rows[0])
  } catch (err) {
    console.log(err.stack)
  }
}

async function hello () {
  const res = await pool.query('SELECT $1::text as message', ['Hello world!'])
  log.info(res.rows[0].message) // Hello world!
}

async function main () {
  await ddl()
  await hello()
  await heartbeat()
  await scrapeScrobbleCastLogcheck()
  await end()
}

main()
