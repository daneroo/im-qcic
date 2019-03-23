module.exports = (req, res) => {
  const time = new Date().toISOString()

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Request-Method', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ time: time }))
}
