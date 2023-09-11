// Require the framework
const Fastify = require('fastify')
// Require library to exit fastify process, gracefully (if possible)
const closeWithGrace = require('close-with-grace')
const config = require('./config')
const log = require('./log')
const routes = require('./routes.js')

// Instantiate Fastify with some config
const fastify = Fastify({
  logger: log,
  trustProxy: true
})

fastify.register(require('fastify-cors'), {
  // put your options here
  origin: true,
  methods: ['GET']
})
fastify.register(require('fastify-mysql'), {
  promise: true,
  // connectionString: 'mysql://root@localhost/mysql'
  ...config.mysql
})

fastify.register(routes)

// // Register your application as a normal plugin.
// const appService = require('./app.js')
// app.register(appService)

// delay is the number of milliseconds for the graceful close to finish
const closeListeners = closeWithGrace({ delay: 500 }, async function ({
  signal,
  err,
  manual
}) {
  fastify.log.info('Graceful shutdown initiated')
  if (err) {
    fastify.log.error(err)
  }
  await fastify.close()
})

fastify.addHook('onClose', async (instance, done) => {
  closeListeners.uninstall()
  done()
})

// Start listening.
const start = async () => {
  try {
    await fastify.listen(config.fastify.port, '0.0.0.0')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
