/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const _ = require('lodash')

const Octokit = require('@octokit/rest')

const defaultOptions = {
  octokit: {}
}

const parallelLimit = async (funcList, limit = 1) => {
  let inFlight = new Set()

  return funcList.map(async (func, i) => {
    // Hold the loop by another loop
    // while the next promise resolves
    while (inFlight.size >= limit) {
      // eslint-disable-next-line promise/no-native
      await Promise.race(inFlight)
    }

    const promise = func()
    // Add promise to inFlight Set
    inFlight.add(promise)
    // Delete promise from Set when it is done
    await promise
    inFlight.delete(promise)
  })
}

const mergeGreenkeeperPullRequest = async function (owner, repo, pull) {
  const isGreenkeeper = pull.user.login === 'greenkeeper[bot]'
  const isSuccess = pull.combinedStatus.state === 'success'
  const isVerified = _.find(pull.combinedStatus.statuses, { context: 'greenkeeper/verify', state: 'success' })

  if (isGreenkeeper && isVerified && isSuccess) {
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

const mergeGreenkeeperPullRequests = async function (owner, repos, { repoConcurrency, pullConcurrency }) {
  const mergedPulls = []

  const handlePull = async (repo, pull) => {
    const mergedPull = await mergeGreenkeeperPullRequest.bind(this)(owner, repo, pull)

    if (mergedPull) {
      mergedPulls.push(mergedPull)
    }
  }

  const handleRepo = async (repo) => {
    const pulls = await this.getRepoPullRequestsByState(owner, repo, 'open')

    const promises = await parallelLimit(pulls.map((pull) => handlePull.bind(this, repo, pull)), pullConcurrency)

    // eslint-disable-next-line promise/no-native
    await Promise.all(promises)
  }

  const promises = await parallelLimit(repos.map((repo) => handleRepo.bind(this, repo)), repoConcurrency)
  // eslint-disable-next-line promise/no-native
  await Promise.all(promises)

  return { mergedPulls }
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
    const { data: { login } } = await this._octokit.users.getAuthenticated()

    return login
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

  async mergeGreenkeeperPullRequests (org, options = { repoConcurrency: 1, pullConcurrency: 1 }) {
    const repos = !org ? await this.getUserRepos() : await this.getOrgRepos(org)
    const owner = !org ? await this.getUser() : org

    const { openedPulls, mergedPulls } = await mergeGreenkeeperPullRequests.bind(this)(owner, repos, options)

    return {
      owner,
      availableRepos: repos.length,
      openedPulls,
      mergedPulls
    }
  }
}

module.exports = GitHubWrapper
