module.exports = (req, res) => {
  const time = new Date().toISOString()
  res.setHeader('Content-Type', 'application/json')
  // res.send(200, JSON.stringify({ time: time }))
  res.end(JSON.stringify({ time: time }))
}
