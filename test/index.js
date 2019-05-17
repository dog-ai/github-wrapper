/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

describe('Module', () => {
  let subject
  let GitHubWrapper

  beforeAll(() => {
    GitHubWrapper = require('../src/github-wrapper')
    jest.mock('../src/github-wrapper')
  })

  describe('when loading', () => {
    beforeEach(() => {
      subject = require('../src/index')
    })

    it('should export github wrapper', () => {
      expect(subject).toBe(GitHubWrapper)
    })
  })
})
