
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
      s: {
        alias: 'sub',
        describe: 'start subscriber (watcher) loop',
        boolean: true
      },
      p: {
        alias: 'pub',
        describe: 'start publish loop',
        boolean: true
      },
      a: {
        alias: 'alarm',
        describe: 'test an alarm',
        boolean: true
      }
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
  if (argv.alarm) {
    console.log('test an alarm')
    alarm.test()
  }
}
