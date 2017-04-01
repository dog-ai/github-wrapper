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

    beforeEach(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should return organization', () => {
      return subject.getUserOrgs()
        .then((result) => {
          result.should.contain(login)
        })
    })
  })

  describe('when getting organization repos', () => {
    const github = { repos: td.object([ 'getAll' ]), hasNextPage: td.function() }
    const login = 'my-owner'
    const data = [ { owner: { login } } ]
    const page = { data }

    before(() => {
      td.when(github.repos.getAll(), { ignoreExtraArgs: true })
        .thenDo((params, callback) => callback(null, page))

      td.when(github.hasNextPage(), { ignoreExtraArgs: true }).thenReturn(false)
    })

    beforeEach(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should merge pull request', () => {
      return subject.getOrgRepos(login)
        .then((repos) => {
          repos.should.be.eql(data)
        })
    })
  })

  describe('when getting repo pull requests by state', () => {
    const github = {
      pullRequests: td.object([ 'getAll' ]),
      repos: td.object([ 'getCombinedStatus' ]),
      hasNextPage: td.function()
    }
    const login = 'my-owner'
    const repo = 'my-repo'
    const state = 'my-state'
    const sha = 'my-sha'
    const pullRequestsData = [ { head: { sha } } ]
    const pullRequestsPage = { data: pullRequestsData }
    const combinedStatusData = {}
    const combinedStatusPage = { data: combinedStatusData }

    before(() => {
      td.when(github.pullRequests.getAll(), { ignoreExtraArgs: true })
        .thenDo((params, callback) => callback(null, pullRequestsPage))

      td.when(github.repos.getCombinedStatus(), { ignoreExtraArgs: true })
        .thenDo((params, callback) => callback(null, combinedStatusPage))

      td.when(github.hasNextPage(), { ignoreExtraArgs: true }).thenReturn(false)
    })

    beforeEach(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should merge pull request', () => {
      return subject.getRepoPullRequestsByState(login, repo, state)
        .then((pullRequests) => {
          pullRequests.should.have.length(pullRequestsData.length)
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

    beforeEach(() => {
      td.replace('github', function () { return github })

      delete require.cache[ require.resolve('../src/github-wrapper') ]
      GitHubWrapper = require('../src/github-wrapper')

      subject = new GitHubWrapper()
    })

    afterEach(() => td.reset())

    it('should merge pull request', () => {
      return subject.mergePullRequest(owner, repo, number, sha)
    })
  })
})
