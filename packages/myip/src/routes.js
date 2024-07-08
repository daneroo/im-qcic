const forwarded = require('@fastify/forwarded')
const { ulid, decodeTime } = require('ulid')
const config = require('./config')

module.exports = routes

// Declare some routes
async function routes (fastify, options) {
  const { hostname, version } = config
  const hostId = ulid()

  fastify.get('/', async (request, reply) => {
    const stamp = new Date().toISOString()
    const reqId = ulid()
    const uptime = (+new Date() - new Date(decodeTime(hostId))) / 1000

    const { remoteAddress, remotePort } = request.socket
    const forwardedAddresses = forwarded(request)
    return {
      hostname,
      hostId,
      version,
      revision: process.env.K_REVISION ?? 'v?', // for cloud run
      uptime,
      stamp,
      reqId,
      remoteAddress,
      remotePort,
      forwardedAddresses
    }
  })
}
