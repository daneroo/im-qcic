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
  const shortText = `${alarm.id}: Alarm ${active ? 'triggered' : 'resolved'} @${alarm.stamp}`

  console.log('Slack notified: ', shortText)
  return res
}

function template (alarm, active) {
  const shortText = `Alarm ${active ? 'triggered' : 'resolved'}`
  const duration = ((+new Date(alarm.stamp) - new Date(alarm.lastSeen)) / 1000).toFixed(3) + 's'
  const tmpl = {
    username: 'qcicbot', // till we get a proper app
    icon_emoji: ':eyes:', // till we get a proper app
    attachments: [
      {
        author_name: alarm.id,
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
          },
          {
            'title': 'Last Seen',
            'value': alarm.lastSeen,
            'short': true
          },
          {
            'title': 'Duration',
            'value': duration,
            'short': true
          }
        ],
        'ts': new Date(alarm.stamp).getTime() / 1000 // unix timestamp...
      }
    ]
  }
  return tmpl
}
