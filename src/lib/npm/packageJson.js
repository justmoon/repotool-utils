'use strict'

const fs = require('fs')
const map = require('lodash/map')
const find = require('lodash/find')
const flatten = require('lodash/flatten')
const merge = require('lodash/merge')

function conforms (pattern, subject, path = '') {
  if (Array.isArray(pattern)) {
    pattern.forEach((subPattern) => {
      // See if we can find a conforming value
      if (!find(subject, (value) => {
        return !conforms(subPattern, value).length
      })) {
        // No conforming value, that's an error
        return [ { path, message: 'missing value' } ]
      } else {
        return []
      }
    })
  } else if (typeof pattern === 'object') {
    if (typeof subject !== 'object') {
      return [ { path, message: 'should be an object' } ]
    }
    const errors = map(pattern, (subPattern, key) => {
      return conforms(subPattern, subject[key], path ? path + '.' + key : key)
    })

    return flatten(errors)
  } else {
    return pattern === subject
      ? []
      : [ { path, message: 'should match' } ]
  }
}


module.exports = (template) => ({
  validate: () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

    const errors = conforms(template, packageJson)

    // TODO: log errors properly
    console.log('errors', errors)

    return !errors.length
  },

  execute: () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    merge(packageJson, template)
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
  }
})
