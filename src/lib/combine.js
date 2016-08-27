'use strict'

const Promise = require('bluebird')
const every = require('lodash/every')
const identity = require('lodash/identity')
const map = require('lodash/map')
const merge = require('lodash/merge')

const PLUGIN_DEFAULTS = {
  hooks: () => ({}),
  validate: () => true,
  prepare: () => undefined,
  execute: () => undefined
}

module.exports = (...plugins) => {
  plugins = plugins.map((plugin) => {
    return Object.assign({}, PLUGIN_DEFAULTS, plugin)
  })

  return {
    validate: () => {
      return Promise.reduce(
        plugins.map((plugin) => plugin.validate()),
        (a, b) => a && b,
        true
      )
    },

    prepare: () => {
      return Promise.reduce(
        plugins.map((plugin) => plugin.prepare()),
        (a, b) => Object.assign(a, b),
        {}
      )
    },

    execute: () => {
      return Promise.reduce(plugins.map((plugin) => plugin.execute()), identity)
    },

    hooks: () => {
      return Promise.mapSeries(plugins, (plugin) => {
        return (typeof plugin.hooks === 'function') ? plugin.hooks() : plugin.hooks
      })
        .then((hooks) => hooks.reduce(merge, {}))
    }
  }
}
