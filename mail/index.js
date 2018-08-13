const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const transporter = nodemailer.createTransport(mg(require('./credentials').mailgun))

// setup email data with unicode symbols
let mailOptions = {
  from: '"QCIC" <daniel.lauzon@imetrical.com>', // sender address
  to: 'daniel.lauzon@imetrical.com', // list of receivers
  //   to: 'daniel.lauzon@gmail.com', // list of receivers
  subject: 'QCIC is OK', // Subject line
  text: 'QCIC monitor is OK', // plain text body
  //   html: '<b>Hello world?</b>' // html body
  html: tmpl() // html body
}

// send mail with defined transport object
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log(error)
  }
  console.log('Message sent: %s', info.messageId)
  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))

  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
})

function tmpl () {
  const colors = {orange: '#FF9F00', green: '#01A64F', red: '#ff0000'}
  const template = require('fs').readFileSync('./alert.tmpl.html', 'utf8')
  let content = template

  content = content.replace(/#FF9F00/g, colors.red)
  content = content.replace(/CAPTION/, 'Warning: you have been warned')
  content = content.replace(/MESSAGE1/, 'This is a message')
  content = content.replace(/MESSAGE2/, 'This is another message')
  content = content.replace(/ACTIONTEXT/, 'Visit for more details')
  content = content.replace(/ACTIONURI/, 'https://ui.qcic.n.imetrical.com/')

  return content
}
