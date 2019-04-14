
const express = require('express')
const { ulid, decodeTime } = require('ulid')

const hostid = ulid()
const app = express()

app.get('/', (req, res) => {
  const ip = req.header('x-forwarded-for') || req.connection.remoteAddress
  const stamp = new Date().toISOString()
  const reqid = ulid()
  const uptime = (+new Date() - new Date(decodeTime(hostid))) / 1000
  res.status(200).json({
    // hostname,
    // networkInterfaces: require('os').networkInterfaces()
    revision: process.env.K_REVISION,
    hostid,
    uptime,
    stamp,
    reqid,
    ip
  })
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`qcic::myip listening on port: ${port}`)
})
