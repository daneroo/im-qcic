
const os = require('os')
const express = require('express')
const ULID = require('ulid')

const hostname = os.hostname()
const hostuid = ULID.ulid()
const app = express()

app.get('/', (req, res) => {
  const ip = req.header('x-forwarded-for') || req.connection.remoteAddress
  const stamp = new Date().toISOString()
  const requid = ULID.ulid()
  const target = process.env.TARGET || 'World'
  res.status(200).json({
    hello: target,
    hostname,
    hostuid,
    stamp,
    requid,
    ip
  })
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Hello world listening on host:${hostname} port: ${port}`)
})
