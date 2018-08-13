const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const transporter = nodemailer.createTransport(mg(require('./credentials').mailgun))

// setup email data with unicode symbols
const values = {
  critical: {
    status: 'Red',
    level: 'Critical',
    color: '#ff0000'
  },
  warning: {
    status: 'Orange',
    level: 'Warning',
    color: '#FF9F00'
  },
  info: {
    status: 'Green',
    level: 'Info',
    color: '#01A64F'
  }
}

const lvl = 'critical'
let mailOptions = {
  from: '"QCIC" <daniel.lauzon@imetrical.com>', // sender address
  //   to: 'daniel.lauzon@imetrical.com', // list of receivers
  to: 'daniel.lauzon@gmail.com', // list of receivers
  subject: `QCIC is ${values[lvl].status}`, // Subject line
  text: `QCIC status is ${values[lvl].status}`, // plain text body
  html: tmpl(values[lvl]) // html body
}

// send mail with defined transport object
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log(error)
  }
  console.log('Message sent: %s', info.messageId)
})

function tmpl (values) {
  const template = require('fs').readFileSync('./alert.tmpl.html', 'utf8')
  let content = template
  content = content.replace(/#FF9F00/g, values.color)
  content = content.replace(/CAPTION/, `${values.level}: you have been warned`)
  content = content.replace(/MESSAGE1/, 'This is a message')
  content = content.replace(/MESSAGE2/, 'This is another message')
  content = content.replace(/ACTIONTEXT/, 'Visit for more details')
  content = content.replace(/ACTIONURI/g, 'https://ui.qcic.n.imetrical.com/')

  return content
}
