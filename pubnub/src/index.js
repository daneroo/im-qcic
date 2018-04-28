
const heartbeat = require('./heartbeat')
const alarm = require('./alarm')

main()
async function main () {
  // console.log('Config:', JSON.stringify(config, null, 2))

  const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .help('h')
    .alias('h', 'help')
    .options({
      w: {
        alias: 'watch',
        describe: 'start  watcher loop',
        boolean: true
      },
      p: {
        alias: 'pub',
        describe: 'start publish (heartbeat) loop',
        boolean: true
      },
      a: {
        alias: 'alarm',
        describe: 'trigger a test alarm',
        boolean: true
      },
      r: {
        alias: 'resolve',
        describe: 'resolve a test alarm',
        boolean: true
      }
    })
    .argv

  if (argv.watch) {
    console.log('starting watcher loop')
    heartbeat.watch()
  }
  if (argv.pub) {
    console.log('start publish (heartbeat) loop')
    heartbeat.publish()
  }
  if (argv.alarm) {
    console.log('test an alarm')
    alarm.test()
  }
}
