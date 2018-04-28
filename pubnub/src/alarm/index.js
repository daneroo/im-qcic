
// const config = require('../config')
// import more generic db functions - which references config directly
const {
  // clean,
  get,
  listMeta,
  save,
  remove
} = require('./db')
const {notify} = require('./slack')

module.exports = {
  trigger,
  resolve,
  test
}

async function trigger (alarm) {
  const existingAlarm = await get('alarms', alarm.id)
  if (!existingAlarm) {
    // send to slack first
    await notify(alarm, true)
    const salarm = await save('alarms', alarm)
    console.log('trigger: alarm saved:', salarm)
  } else {
    console.log('trigger: alarm already set', existingAlarm)
  }
}
async function resolve (alarm) {
  const existingAlarm = await get('alarms', alarm.id)
  if (existingAlarm) {
    await notify(alarm, false)
    await remove('alarms', existingAlarm.id)
    console.log('resolve: alarm deleted')
  } else {
    // console.log('resolve: no alarm to resolve')
  }
}

// test: create then delete an alarm
async function test () {
  const alarm = {
    id: 'qcic.heartbeat.test', // default UUID
    created: new Date().toISOString()
  }
  try {
    let a

    a = await get('alarms', alarm.id)
    console.log('alarm if exists:', a)

    if (!a) {
      const salarm = await save('alarms', alarm)
      console.log('alarm saved:', salarm)
    }

    const alarms = await listMeta('alarms')
    console.log('existing alarms (meta)', alarms)

    a = await get('alarms', alarm.id)
    console.log('alarm if exists', a)

    if (a) {
      const dalarm = await remove('alarms', alarm.id)
      console.log('alarm deleted', dalarm)
    }
  } catch (error) {
    console.log('error', error)
  }
}
