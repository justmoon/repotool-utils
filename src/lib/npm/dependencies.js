'use strict'

const execSync = require('child_process').execSync
const every = require('lodash/every')
const includes = require('lodash/includes')
const find = require('lodash/find')
const filter = require('lodash/filter')
const map = require('lodash/map')
const fs = require('fs')

const DEPENDENCY_TYPES = [
  'dependencies',
  'devDependencies',
  'optionalDependencies'
]

const SAVE_FLAGS = {
  dependencies: '--save',
  devDependencies: '--save-dev',
  optionalDependencies: '--save-optional'
}

module.exports = (packages) => {
  if (!Array.isArray(packages)) {
    packages = [packages]
  }

  packages = packages.map((packageInfo) => {
    if (typeof packageInfo === 'string') {
      packageInfo = {
        name: packageInfo
      }
    }

    if (typeof packageInfo.name !== 'string') {
      throw new TypeError('Package description must contain a name')
    }

    if (!packageInfo.version) {
      packageInfo.version = '*'
    }

    if (!packageInfo.type) {
      packageInfo.type = 'devDependencies'
    }

    if (!includes(DEPENDENCY_TYPES, packageInfo.type)) {
      throw new Error('Invalid dependency type: ' + packageInfo.type)
    }

    return packageInfo
  })

  function getStatus () {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

    packageJson.dependencies = packageJson.dependencies || []
    packageJson.devDependencies = packageJson.devDependencies || []
    packageJson.optionalDependencies = packageJson.optionalDependencies || []

    const allDependencies = Object.assign({},
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.optionalDependencies
    )

    const missingPackages = []
    const wrongTypePackages = []
    packages.forEach((pkgInfo) => {
      if (!includes(Object.keys(packageJson[pkgInfo.type]), pkgInfo.name)) {
        // The dependency does not exist under the correct type, but maybe
        // one of the other types?
        const wrongType = find(DEPENDENCY_TYPES, (type) => {
          if (includes(Object.keys(packageJson[type]), pkgInfo.name)) {
            return {
              name: pkgInfo.name,
              requestedType: pkgInfo.type,
              actualType: type
            }
          }
        })

        if (wrongType) {
          wrongTypePackages.push(wrongType)
        } else {
          missingPackages.push(pkgInfo)
        }
      }
    })

    return { missingPackages, wrongTypePackages }
  }

  return {
    getStatus: getStatus,

    validate: () => {
      const { missingPackages, wrongTypePackages } = getStatus()

      // TODO: log package errors properly
      console.log('missingPackages', missingPackages)
      console.log('wrongTypePackages', wrongTypePackages)

      return !(missingPackages.length || wrongTypePackages.length)
    },

    execute: () => {
      const { missingPackages, wrongTypePackages } = getStatus()

      DEPENDENCY_TYPES.forEach((type) => {
        const packages = map(filter(missingPackages, { type }), 'name')

        execSync('npm install ' + SAVE_FLAGS[type] + ' ' + packages.join(' '))
      })

      return Promise.resolve()
    }
  }
}
