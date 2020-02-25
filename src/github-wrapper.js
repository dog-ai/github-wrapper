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

      pull.combinedStatus = await this._octokit.repos.getCombinedStatusForRef({ owner, repo, ref })
        .then(({ data }) => data)

      pull.checks = await this._octokit.checks.listForRef({ owner, repo, ref })
        .then(({ data }) => data)
    }

    return pulls
  }

  async createPullRequest (owner, repo, title, head, base) {
    try {
      const { data } = await this._octokit.pulls.create({ owner, repo, title, head, base })

      return data
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async closePullRequest (owner, repo, number) {
    try {
      await this._octokit.pulls.update({ owner, repo, pull_number: number, state: 'closed' })
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async mergePullRequest (owner, repo, number, sha, method, title, message) {
    try {
      const { data } = await this._octokit.pulls.merge({
        owner,
        repo,
        pull_number: number,
        sha,
        commit_title: title,
        commit_message: message,
        merge_method: method
      })

      return data
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async listPullRequestReviews (owner, repo, number) {
    const options = this._octokit.pulls.listReviews.endpoint.merge({ owner, repo, pull_number: number })

    return this._octokit.paginate(options)
  }

  async reviewPullRequest (owner, repo, number, commitId, event) {
    try {
      await this._octokit.pulls.createReview({
        owner,
        repo,
        pull_number: number,
        commit_id: commitId,
        event
      })
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async requestPullRequestReview (owner, repo, number, reviewers) {
    try {
      await this.octokit.pulls.createReviewRequest({
        owner,
        repo,
        pull_number: number,
        reviewers: reviewers
      })
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async getPullRequestComments (owner, repo, number) {
    const options = this._octokit.issues.listComments.endpoint.merge({ owner, repo, issue_number: number })

    const comments = await this._octokit.paginate(options)

    return comments
  }
}

module.exports = GitHubWrapper
