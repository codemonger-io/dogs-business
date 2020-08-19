const express = require('express')
const path = require('path')

const port = 3001
const app = express()

app.use('/', express.static(path.resolve(__dirname, './dist')))

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})
