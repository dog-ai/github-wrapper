/*
 * Copyright (C) 2017, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

describe('Module', () => {
  let subject
  let GitHubWrapper

  before(() => {
    GitHubWrapper = td.object([])
  })

  afterEach(() => td.reset())

  describe('when loading', () => {
    beforeEach(() => {
      td.replace('../src/github-wrapper', GitHubWrapper)

      subject = require('../src/index')
    })

    it('should export github wrapper', () => {
      subject.should.be.equal(GitHubWrapper)
    })
  })
})
