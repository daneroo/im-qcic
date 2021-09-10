const { connect, JSONCodec } = require('nats')
const os = require('os')

const opts = {
  name: 'test-client-server',
  maxReconnectAttempts: -1,
  // waitOnFirstConnect: true, // not sure if this is a good idea
  verbose: true
}

const interval = 3000
const count = 10
const subject = 'im.test.heartbeat'
const hostname = process.env.HOSTNAME || os.hostname()
const clientId = Math.round(1000 + Math.random() * 1000)

doit()
async function doit () {
  let nc
  try {
    nc = await connect(opts)
  } catch (err) {
    console.log(`error connecting to nats: ${err.message}`)
    return
  }
  console.info(`connected ${nc.getServer()}`)
  const done = nc.closed()

  // Don't await, the returned promise will not resolve..
  subscribeLoop(nc)

  // publish a few messages (finite count), so we can clean up and close
  await publishLoop(nc)

  // Now clean things up
  await nc.flush()
  await nc.close()
  // check if the close was OK
  const err = await done
  if (err) {
    console.log('error closing:', err)
  } else {
    console.log('connection closed')
  }
}

// this should never return
async function subscribeLoop (nc) {
  const jc = JSONCodec()
  const sub = nc.subscribe(subject)
  for await (const m of sub) {
    const payload = jc.decode(m.data)
    console.log(`<< [${m.subject}]: ${JSON.stringify(payload)}`)
  }
}

// Will resolve after `count` published events
async function publishLoop (nc) {
  const jc = JSONCodec()

  // This is the publish loop
  for (let i = 1; i <= count; i++) {
    const payload = {
      stamp: new Date().toISOString(),
      host: [hostname, clientId].join('-'),
      text: clientId
    }
    nc.publish(subject, jc.encode(payload))
    console.log(`>> [${subject}]: ${JSON.stringify(payload)}`)

    if (interval) {
      await delay(interval)
    }
  }
}

function delay (ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}
