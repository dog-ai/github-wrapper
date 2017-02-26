/*
 * Copyright (C) 2017, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

describe('GitHubWrapper', () => {
  let subject
  let GitHubWrapper

  describe('when constructing', () => {
    before(() => {
      GitHubWrapper = require('../src/github-wrapper')
    })

    it('should create a GitHub client with user API properties', () => {
      subject = new GitHubWrapper()

      subject.github.should.have.deep.property('.users.get')
      subject.github.should.have.deep.property('.users.getOrgMemberships')
    })

    it('should create a GitHub client with repos API properties', () => {
      subject = new GitHubWrapper()

      subject.github.should.have.deep.property('.repos.getAll')
      subject.github.should.have.deep.property('.repos.getCombinedStatus')
    })

    it('should create a GitHub client with pullRequests API properties', () => {
      subject = new GitHubWrapper()

      subject.github.should.have.deep.property('.pullRequests.getAll')
      subject.github.should.have.deep.property('.pullRequests.merge')
    })
  })

  describe('when constructing with a GitHub personal token', () => {
    const token = 'my-token'
    const auth = { type: 'token', token }
    const options = { auth }

    before(() => {
      GitHubWrapper = require('../src/github-wrapper')
    })

    it('should create a GitHub client with token authentication', () => {
      subject = new GitHubWrapper(options)

      subject.github.auth.should.eql(auth)
    })
  })

  describe('when getting user', () => {
    const github = { users: td.object([ 'get' ]) }
    const data = {}
    const page = { data }

    before(() => {
      td.when(github.users.get(), { ignoreExtraArgs: true }).thenResolve(page)
    })

    before(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should return user', () => {
      return subject.getUser()
        .then((result) => {
          result.should.be.equal(data)
        })
    })
  })

  describe('when getting user organizations', () => {
    const github = { users: td.object([ 'getOrgMemberships' ]) }
    const login = 'my-organization-login'
    const data = [ { organization: { login } } ]
    const page = { data }

    before(() => {
      td.when(github.users.getOrgMemberships(), { ignoreExtraArgs: true }).thenResolve(page)
    })

    before(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should return organization', () => {
      return subject.getUserOrganizations()
        .then((result) => {
          result.should.contain(login)
        })
    })
  })

  describe('when merging pull request', () => {
    const github = { pullRequests: td.object([ 'merge' ]) }
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const sha = 'my-sha'

    before(() => {
      td.when(github.pullRequests.merge({ owner, repo, number, sha })).thenResolve()
    })

    before(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should merge pull request', () => {
      const result = subject.mergePullRequest(owner, repo, number, sha)

      result.should.be.fullfiled // eslint-disable-line
    })
  })
})
