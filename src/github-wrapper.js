/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const _ = require('lodash')

const Octokit = require('@octokit/rest')

const defaultOptions = {
  octokit: {}
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
    return this._octokit.users.getAuthenticated()
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

      pull.combinedStatus = await this._octokit.repos.getCombinedStatusForRef({ owner, repo, ref })
    }

    return pulls
  }

  async mergePullRequest (owner, repo, number, sha) {
    return this._octokit.pulls.merge({ owner, repo, pull_number: number, sha })
  }

  async mergeOrgGreenkeeperPullRequests (org) {
    const mergedPullRequests = []

    const mergeGreenkeeperPullRequest = (owner, repoName, pull) => {
      const isGreenkeeper = pull.user.login === 'greenkeeper[bot]'
      const isSuccess = pull.combinedStatus[ 0 ].state === 'success'
      const statuses = pull.combinedStatus[ 0 ].statuses
      const isVerified = _.find(statuses, { context: 'greenkeeper/verify', state: 'success' })

      if (isGreenkeeper && isSuccess && isVerified) {
        const number = pull.number
        const sha = pull.sha

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

    const repos = await this.getOrgRepos(org)

    for (const repo of repos) {
      const pulls = await this.getRepoPullRequestsByState(org, repo.name, 'open')

      for (const pull of pulls) {
        mergeGreenkeeperPullRequest(org, repo.name, pull)

        mergedPullRequests.push(pull)
      }
    }

    return mergedPullRequests
  }
}

module.exports = GitHubWrapper
