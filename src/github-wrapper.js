/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const EventEmitter = require('events')

const _ = require('lodash')

const Octokit = require('@octokit/rest')

const defaultOptions = {
  octokit: {}
}

class GitHubWrapper extends EventEmitter {
  constructor (options = {}) {
    super()

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

  async createPullRequest (owner, repo, title, head, base) {
    try {
      const { data } = await this._octokit.pulls.create({ owner, repo, title, head, base })

      this.emit('pulls:create', owner, repo, title, head, base)

      return data
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async closePullRequest (owner, repo, number) {
    try {
      await this._octokit.pulls.update({ owner, repo, pull_number: number, state: 'closed' })

      this.emit('pulls:close', owner, repo, number)
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

      this.emit('pulls:merge', owner, repo, number, sha, data, title, message, method)

      return data
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
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

      this.emit('pulls:review', owner, repo, number, commitId, event)
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

      this.emit('pulls:review:request', owner, repo, number, reviewers)
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
