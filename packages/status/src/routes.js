const config = require('./config')
const logcheck = require('./logcheck')
const tedcheck = require('./tedcheck')

module.exports = routes

// Declare some routes
async function routes (fastify, options) {
  const { hostname, version } = config
  const metaBase = { hostname, version }

  fastify.get('/', async (request, reply) => {
    return config.version
  })

  fastify.get('/api/version', async (request, reply) => {
    return {
      stamp: new Date().toISOString(),
      ...metaBase,
      type: 'version'
    }
  })

  fastify.get('/api/logcheck', async (request, reply) => {
    const meta = {
      stamp: new Date().toISOString(),
      ...metaBase,
      type: 'logcheck'
    }
    const data = await logcheck.asTable()
    return { meta, data }
  })

  fastify.get('/api/tedcheck', async (request, reply) => {
    const meta = {
      stamp: new Date().toISOString(),
      ...metaBase,
      type: 'tedcheck'
    }
    const data = {}
    const connection = await fastify.mysql.getConnection()
    for (const qyName in tedcheck.queries) {
      request.log.info({ qyName }, 'Fetching')
      const qy = tedcheck.queries[qyName]
      data[qyName] = tedcheck.iso8601ify(tedcheck.asTable(await tedcheck.query(connection, qy)))
    }
    connection.release()

    return { meta, data }
  })
}
