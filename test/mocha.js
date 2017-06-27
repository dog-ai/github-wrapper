/*
 * Copyright (C) 2017, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const _ = require('lodash')
const Promise = require('bluebird')

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.config.includeStack = true

const td = require('testdouble')
td.config({
  promiseConstructor: Promise,
  ignoreWarnings: true
})

global._ = _
global.should = chai.should()
global.td = td
