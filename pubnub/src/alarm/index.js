
// const config = require('../config')
// import more generic db functions - which references config directly
const {
  // clean,
  get,
  listMeta,
  save,
  remove
} = require('./db')

module.exports = {
  test
}

// create then delete an alarm
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
    console.log('alarm exists', a)

    if (a) {
      const dalarm = await remove('alarms', alarm.id)
      console.log('alarm deleted', dalarm)
    }
  } catch (error) {
    console.log('error', error)
  }
}
