/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const _ = require('lodash')

const Octokit = require('@octokit/rest')

const defaultOptions = {
  octokit: {}
}

const mergeGreenkeeperPullRequest = async function (owner, repo, pull) {
  const isGreenkeeper = pull.user.login === 'greenkeeper[bot]'
  const isSuccess = pull.combinedStatus.state === 'success'
  const isVerified = _.find(pull.combinedStatus.statuses, { context: 'greenkeeper/verify', state: 'success' })

  if (isGreenkeeper && isSuccess && isVerified) {
    const number = pull.number
    const sha = pull.head.sha
    const url = pull.url

    try {
      await this.mergePullRequest(owner, repo, number, sha)

      return { owner, repo, url, number, sha, success: true }
    } catch (error) {
      return { owner, repo, url, number, sha, success: false, error }
    }
  }
}

const mergeGreenkeeperPullRequests = async function (owner, repos) {
  const mergedPulls = []
  let openedPulls = 0

  for (const repo of repos) {
    const pulls = await this.getRepoPullRequestsByState(owner, repo, 'open')
    openedPulls += pulls.length

    for (const pull of pulls) {
      const mergedPull = await mergeGreenkeeperPullRequest(owner, repo, pull)

      if (mergedPull) {
        openedPulls--
        mergedPulls.push(mergedPull)
      }
    }
  }

  return { openedPulls, mergedPulls }
}

class GitHubWrapper {
  constructor (options = {}) {
    this._options = _.defaultsDeep({}, options, defaultOptions)

    this._octokit = new Octokit(this._options.octokit)
  }

  get octokit () {
    return this._octokit
  }

  async getUser () {
    const { data } = await this._octokit.users.getAuthenticated()

    return data
  }

  async getUserRepos () {
    const options = this._octokit.repos.list.endpoint.merge({ affiliation: 'owner' })

    const repos = await this._octokit.paginate(options)

    return _.map(repos, 'name')
  }

  async getUserOrgs () {
    const options = this._octokit.orgs.listForAuthenticatedUser.endpoint.merge()

    const orgs = await this._octokit.paginate(options)

    return _.map(orgs, 'login')
  }

  async getOrgRepos (org) {
    const options = this._octokit.repos.listForOrg.endpoint.merge({ org })

    const repos = await this._octokit.paginate(options)

    return _.map(repos, 'name')
  }

  async getRepoPullRequestsByState (owner, repo, state) {
    const options = this._octokit.pulls.list.endpoint.merge({ owner, repo, state })

    const pulls = await this._octokit.paginate(options)

    for (const pull of pulls) {
      const ref = pull.head.sha

      const { data } = await this._octokit.repos.getCombinedStatusForRef({ owner, repo, ref })
      pull.combinedStatus = data
    }

    return pulls
  }

  async mergePullRequest (owner, repo, number, sha) {
    return this._octokit.pulls.merge({ owner, repo, pull_number: number, sha })
  }

  async mergeUserGreenkeeperPullRequests () {
    const login = await this.getUser()
    const repos = await this.getUserRepos()

    const { openedPulls, mergedPulls } = await mergeGreenkeeperPullRequests.bind(this)(login, repos)

    return {
      login,
      availableRepos: repos.length,
      openedPulls,
      mergedPulls
    }
  }

  async mergeOrgGreenkeeperPullRequests (org) {
    const repos = await this.getOrgRepos(org)

    const { openedPulls, mergedPulls } = await mergeGreenkeeperPullRequests.bind(this)(org, repos)

    return {
      org,
      availableRepos: repos.length,
      openedPulls,
      mergedPulls
    }
  }
}

module.exports = GitHubWrapper
