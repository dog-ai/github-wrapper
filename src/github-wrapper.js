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

  getUserOrgs () {
    return this.github.users.getOrgMemberships({})
      .then((page) => page.data)
      .mapSeries((orgMembership) => orgMembership.organization.login)
  }

  getOrgRepos (owner) {
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

  mergeGreenkeeperPullRequests (owner) {
    return this.getOrgRepos(owner)
      .mapSeries((repo) => {
        const name = repo.name

        return this.getRepoPullRequestsByState(owner, name, 'open')
          .mapSeries((pullRequest) => {
            const isGreenkeeper = pullRequest.user.login === 'greenkeeper[bot]'
            const isSuccess = pullRequest.combinedStatus[ 0 ].state === 'success'
            const statuses = pullRequest.combinedStatus[ 0 ].statuses
            const isVerified = _.find(statuses, { context: 'greenkeeper/verify', state: 'success' })

            if (isGreenkeeper && isSuccess && isVerified) {
              const number = pullRequest.number
              const sha = pullRequest.sha
              return this.mergePullRequest(owner, name, number, sha)
                .catch((error) => console.error(error))
            }
          })
      })
  }
}

module.exports = GitHubWrapper
