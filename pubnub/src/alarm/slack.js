const { WebClient } = require('@slack/client')
const config = require('../config')
const token = config.credentials.slack.token
const web = new WebClient(token)

module.exports = {
  notify
}
// conversationId can be a channel ID, a DM ID, a MPDM ID, or a group ID
const channel = 'qcic'
async function notify (alarm, active) {
  const tmpl = template(alarm, active)
  const res = await web.chat.postMessage({ channel, ...tmpl })
  // `res` contains information about the posted message
  const shortText = `${alarm.id}: Alarm ${active ? 'triggered' : 'resolved'} `

  console.log('Slack notified: ', shortText, new Date(res.ts * 1000).toISOString())
  return res
}

function template (alarm, active) {
  const shortText = `${alarm.id}: Alarm ${active ? 'triggered' : 'resolved'} `
  const tmpl = {
    username: 'qcicbot', // till we get a proper app
    icon_emoji: ':eyes:', // till we get a proper app
    attachments: [
      {
        fallback: shortText, // can do better
        // good, warning, danger, or any hex color code (eg. #439FE0)
        color: active ? 'danger' : 'good',
        pretext: shortText,
        title: 'QCIC Watcher',
        title_link: 'https://ui-qcic.now.sh/',
        // text: 'Optional text that appears within the attachment',
        fields: [
          {
            'title': 'Present',
            'value': alarm.present,
            'short': true
          },
          {
            'title': 'Quorum',
            'value': alarm.quorum,
            'short': true
          }
        ]
        // 'ts': 1524879280.000061 // unix timestamp...
      }
    ]
  }
  return tmpl
}
