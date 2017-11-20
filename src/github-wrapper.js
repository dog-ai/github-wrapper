/*
 * Copyright (C) 2017, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const _ = require('lodash')
const Promise = require('bluebird')

const GitHub = require('github')

const all = function (fn, params) {
  return new Promise((resolve, reject) => {
    let data = []

    const next = (error, page) => {
      if (error) {
        return reject(error)
      }

      data = data.concat(page.data)

      if (this._github.hasNextPage(page)) {
        this._github.getNextPage(page, next)
      } else {
        resolve(data)
      }
    }

    fn(params, next)
  })
}

const defaultOptions = {
  github: {
    type: 'token'
  }
}

class GitHubWrapper {
  constructor (options = {}) {
    this._options = _.defaultsDeep({}, options, defaultOptions)

    this._github = new GitHub({ Promise })

    switch (_.get(this._options, 'github.type')) {
      case 'token':
        this._github.authenticate(_.get(this._options, 'github'))

        break
      default:
    }
  }

  get github () {
    return this._github
  }

  getUser () {
    return this._github.users.get({})
      .then((page) => page.data)
  }

  getUserOrgs () {
    return this._github.users.getOrgMemberships({})
      .then((page) => page.data)
      .mapSeries((orgMembership) => orgMembership.organization.login)
  }

  getOrgRepos (owner) {
    return all.bind(this)(this._github.repos.getAll, { per_page: 100 })
      .then((repos) => _.filter(repos, { owner: { login: owner } }))
  }

  getRepoPullRequestsByState (owner, repo, state) {
    return all.bind(this)(this._github.pullRequests.getAll, {
      owner,
      repo,
      state,
      per_page: 100,
      sort: 'created',
      direction: 'asc'
    })
      .mapSeries((pullRequest) => {
        const ref = pullRequest.head.sha
        return all.bind(this)(this._github.repos.getCombinedStatusForRef, {
          owner,
          repo,
          ref,
          per_page: 100
        })
          .then((combinedStatus) => {
            pullRequest.combinedStatus = combinedStatus

            return pullRequest
          })
      })
  }

  mergePullRequest (owner, repo, number, sha) {
    return this._github.pullRequests.merge({ owner, repo, number, sha })
  }

  mergeGreenkeeperPullRequests (owner) {
    const mergedPullRequests = []

    const mergeGreenkeeperPullRequest = (owner, repoName, pullRequest) => {
      const isGreenkeeper = pullRequest.user.login === 'greenkeeper[bot]'
      const isSuccess = pullRequest.combinedStatus[ 0 ].state === 'success'
      const statuses = pullRequest.combinedStatus[ 0 ].statuses
      const isVerified = _.find(statuses, { context: 'greenkeeper/verify', state: 'success' })

      if (isGreenkeeper && isSuccess && isVerified) {
        const number = pullRequest.number
        const sha = pullRequest.sha

        return this.mergePullRequest(owner, repoName, number, sha)
          .then(() => mergedPullRequests.push({ owner, repoName, number, sha, success: true }))
          .catch((error) => mergedPullRequests.push({
            owner,
            repoName,
            number,
            sha,
            success: false,
            error
          }))
      }
    }

    return this.getOrgRepos(owner)
      .mapSeries((repo) => {
        const repoName = repo.name

        return this.getRepoPullRequestsByState(owner, repoName, 'open')
          .mapSeries((pullRequest) => mergeGreenkeeperPullRequest(owner, repoName, pullRequest))
          .catch(() => {})
      })
      .then(() => mergedPullRequests)
      .catch(() => {})
  }
}

module.exports = GitHubWrapper
