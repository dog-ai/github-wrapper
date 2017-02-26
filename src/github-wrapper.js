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

      if (this.github.hasNextPage(page)) {
        this.github.getNextPage(page, next)
      } else {
        resolve(data)
      }
    }

    fn(params, next)
  })
}

const defaultOptions = { auth: {} }

class GitHubWrapper {
  constructor (options = defaultOptions) {
    const { auth } = _.defaults(options, defaultOptions)

    this.github = new GitHub({ Promise })

    const type = auth.type
    switch (type) {
      case 'token':
        this.github.authenticate({ type, token: auth.token })
        break
      default:
    }
  }

  getUser () {
    return this.github.users.get({})
      .then((page) => page.data)
  }

  getUserOrganizations () {
    return this.github.users.getOrgMemberships({})
      .then((page) => page.data)
      .mapSeries((orgMembership) => orgMembership.organization.login)
  }

  getOrganizationRepos (owner) {
    return all.bind(this)(this.github.repos.getAll, { per_page: 100 })
      .then((repos) => _.filter(repos, { owner: { login: owner } }))
  }

  getRepoPullRequestsByState (owner, repo, state) {
    return all.bind(this)(this.github.pullRequests.getAll, {
      owner,
      repo,
      state,
      per_page: 100,
      sort: 'created',
      direction: 'asc'
    })
      .mapSeries((pullRequest) => {
        const ref = pullRequest.head.sha
        return all.bind(this)(this.github.repos.getCombinedStatus, {
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
    return this.github.pullRequests.merge({ owner, repo, number, sha })
  }
}

module.exports = GitHubWrapper
