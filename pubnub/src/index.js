
const heartbeat = require('./heartbeat')

main()
async function main () {
  // console.log('Config:', JSON.stringify(config, null, 2))

  const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .help('h')
    .alias('h', 'help')
    .options({
      s: {
        alias: 'sub',
        describe: 'start subscriber loop',
        boolean: true
      },
      p: {
        alias: 'pub',
        describe: 'start publish loop',
        boolean: true
      }
      // q: {
      //   alias: 'requestor',
      //   describe: 'start requestor loop',
      //   boolean: true
      // },
      // r: {
      //   alias: 'responder',
      //   describe: 'start responder',
      //   boolean: true
      // }
    })
    .argv

  if (argv.sub) {
    console.log('start subscriber loop')
    heartbeat.watch()
  }
  if (argv.pub) {
    console.log('start publish loop')
    heartbeat.publish()
  }
}
