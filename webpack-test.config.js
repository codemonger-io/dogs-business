const path = require('path')

const config = require('./webpack.config.js')

// adds an alias '@test' associated with the test directory.
config.resolve.alias['@test'] = path.resolve(__dirname, 'test')

module.exports = config
