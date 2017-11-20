/*
 * Copyright (C) 2017, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

describe('GitHubWrapper', () => {
  let subject
  let GitHub

  before(() => {
    GitHub = td.constructor([ 'authenticate' ])
    GitHub.prototype.users = td.object([ 'get', 'getOrgMemberships' ])
    GitHub.prototype.repos = td.object([ 'getAll', 'getCombinedStatusForRef' ])
    GitHub.prototype.hasNextPage = td.function()
    GitHub.prototype.pullRequests = td.object([ 'getAll', 'merge' ])
  })

  afterEach(() => td.reset())

  describe('when constructing', () => {
    const token = 'my-token'
    const options = { github: { token } }

    beforeEach(() => {
      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should create a GitHub client with user API properties', () => {
      subject.github.should.have.nested.property('.users.get')
      subject.github.should.have.nested.property('.users.getOrgMemberships')
    })

    it('should create a GitHub client with repos API properties', () => {
      subject.github.should.have.nested.property('.repos.getAll')
      subject.github.should.have.nested.property('.repos.getCombinedStatusForRef')
    })

    it('should create a GitHub client with pullRequests API properties', () => {
      subject.github.should.have.nested.property('.pullRequests.getAll')
      subject.github.should.have.nested.property('.pullRequests.merge')
    })
  })

  describe('when constructing with a github personal token', () => {
    const token = 'my-token'
    const options = { github: { type: 'token', token } }

    beforeEach(() => {
      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should create a github client with token authentication', () => {
      subject.github.auth.should.be.eql(options.github)
    })
  })

  describe('when getting user', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const data = {}
    const page = { data }

    beforeEach(() => {
      td.replace('github', GitHub)
      td.when(GitHub.prototype.users.get(), { ignoreExtraArgs: true }).thenResolve(page)

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should return user', () => {
      return subject.getUser()
        .then((result) => {
          result.should.be.equal(data)
        })
    })
  })

  describe('when getting user organizations', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const login = 'my-organization-login'
    const data = [ { organization: { login } } ]
    const page = { data }

    beforeEach(() => {
      td.replace('github', GitHub)
      td.when(GitHub.prototype.users.getOrgMemberships(), { ignoreExtraArgs: true }).thenResolve(page)

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should return organization', () => {
      return subject.getUserOrgs()
        .then((result) => {
          result.should.contain(login)
        })
    })
  })

  describe('when getting organization repos', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const login = 'my-owner'
    const data = [ { owner: { login } } ]
    const page = { data }

    beforeEach(() => {
      td.replace('github', GitHub)
      td.when(GitHub.prototype.repos.getAll(td.matchers.anything()), { ignoreExtraArgs: true }).thenCallback(null, page)
      td.when(GitHub.prototype.hasNextPage(), { ignoreExtraArgs: true }).thenReturn(false)

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should merge pull request', () => {
      return subject.getOrgRepos(login)
        .then((repos) => {
          repos.should.be.eql(data)
        })
    })
  })

  describe('when getting repo pull requests by state', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const login = 'my-owner'
    const repo = 'my-repo'
    const state = 'my-state'
    const sha = 'my-sha'
    const pullRequestsData = [ { head: { sha } } ]
    const pullRequestsPage = { data: pullRequestsData }
    const combinedStatusData = {}
    const combinedStatusPage = { data: combinedStatusData }

    beforeEach(() => {
      td.replace('github', GitHub)
      td.when(GitHub.prototype.pullRequests.getAll(td.matchers.anything()), { ignoreExtraArgs: true })
        .thenCallback(null, pullRequestsPage)
      td.when(GitHub.prototype.repos.getCombinedStatusForRef(td.matchers.anything()), { ignoreExtraArgs: true })
        .thenCallback(null, combinedStatusPage)
      td.when(GitHub.prototype.hasNextPage(), { ignoreExtraArgs: true }).thenReturn(false)

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should merge pull request', () => {
      return subject.getRepoPullRequestsByState(login, repo, state)
        .then((pullRequests) => {
          pullRequests.should.have.length(pullRequestsData.length)
        })
    })
  })

  describe('when merging pull request', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const sha = 'my-sha'

    beforeEach(() => {
      td.replace('github', GitHub)
      td.when(GitHub.prototype.pullRequests.merge({ owner, repo, number, sha })).thenResolve()

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
    })

    it('should resolve promise', () => {
      return subject.mergePullRequest(owner, repo, number, sha)
    })
  })

  describe('when merging greenkeeper pull request', () => {
    const token = 'my-token'
    const options = { github: { token } }
    const owner = 'my-owner'
    const repoName = 'my-repo-name'
    const repo = { name: repoName }
    const repos = [ repo ]
    const number = 'my-number'
    const sha = 'my-sha'
    const pullRequest = {
      user: { login: 'greenkeeper[bot]' },
      number,
      sha,
      combinedStatus: [ {
        state: 'success',
        statuses: [ { context: 'greenkeeper/verify', state: 'success' } ]
      } ]
    }
    const pullRequests = [ pullRequest ]

    beforeEach(() => {
      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper(options)
      subject.mergePullRequest = td.function()
      subject.getOrgRepos = td.function()
      subject.getRepoPullRequestsByState = td.function()

      td.when(subject.getOrgRepos(owner)).thenResolve(repos)
      td.when(subject.getRepoPullRequestsByState(owner, repoName, 'open')).thenResolve(pullRequests)
      td.when(subject.mergePullRequest(owner, repoName, number, sha)).thenResolve()
    })

    it('should resolve promise with merge pull request', () => {
      return subject.mergeGreenkeeperPullRequests(owner)
        .then((mergedPullRequests) => {
          mergedPullRequests.should.be.lengthOf(1)
          mergedPullRequests[ 0 ].owner.should.be.equal(owner)
          mergedPullRequests[ 0 ].number.should.be.equal(number)
          mergedPullRequests[ 0 ].repoName.should.be.equal(repoName)
          mergedPullRequests[ 0 ].sha.should.be.equal(sha)
          mergedPullRequests[ 0 ].success.should.be.equal(true)
        })
    })
  })
})
