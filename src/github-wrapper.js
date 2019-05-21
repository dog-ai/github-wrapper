/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

const EventEmitter = require('events')

const _ = require('lodash')

const Octokit = require('@octokit/rest')

const defaultOptions = {
  octokit: {}
}

const parallel = async (functions, parallelism = 1) => {
  const queue = new Set()

  return functions.map(async (f) => {
    while (queue.size >= parallelism) {
      // eslint-disable-next-line promise/no-native
      await Promise.race(queue)
    }

    const promise = f()
    queue.add(promise)

    await promise

    queue.delete(promise)
  })
}

const isGreenkeeperPull = (pull) => {
  return pull.user.login === 'greenkeeper[bot]' &&
    !!_.find(pull.combinedStatus.statuses, {
      context: 'greenkeeper/verify',
      state: 'success'
    })
}

const isGreenkeeperPullUpdatedByOwner = (pull, owner) => {
  return pull.user.login === owner &&
    !!_.find(pull.labels, { name: 'greenkeeper' })
}

const findGreenkeeperCommentAboutLatestVersion = (comments) => {
  if (_.isEmpty(comments)) {
    return
  }

  const latestComment = _.last(_.filter(comments, { user: { login: 'greenkeeper[bot]' } }))

  if (!latestComment) {
    return
  }

  const encodedHead = _.last(/\.\.\.[\w-]+:(.*)\)/.exec(latestComment.body))
  if (!encodedHead) {
    return
  }

  return decodeURIComponent(encodedHead)
}

const mergeGreenkeeperPullRequest = async function (owner, repo, pull) {
  if (!(isGreenkeeperPull(pull) || isGreenkeeperPullUpdatedByOwner(pull, owner))) {
    return
  }

  const isSuccess = pull.combinedStatus.state === 'success'

  if (isSuccess) {
    await this.mergePullRequest(owner, repo, pull.number, pull.head.sha)
  }

  if (!isSuccess && isGreenkeeperPull(pull)) {
    const comments = await this.getPullRequestComments(owner, repo, pull.number)
    const head = findGreenkeeperCommentAboutLatestVersion(comments)

    if (head) {
      await updateGreenkeeperPullRequestWithLatestVersion.bind(this)(owner, repo, pull.number, head)
    }
  }
}

const mergeGreenkeeperPullRequests = async function (owner, repos, { repoConcurrency, pullConcurrency }) {
  const handlePull = async (repo, pull) => {
    try {
      await mergeGreenkeeperPullRequest.bind(this)(owner, repo, pull)
    } catch (error) {
      this.emit('error', error, owner, repo, pull)
    }
  }

  const handleRepo = async (repo) => {
    const pulls = await this.getRepoPullRequestsByState(owner, repo, 'open')

    const promises = await parallel(pulls.map((pull) => handlePull.bind(this, repo, pull)), pullConcurrency)

    // eslint-disable-next-line promise/no-native
    await Promise.all(promises)
  }

  const promises = await parallel(repos.map((repo) => handleRepo.bind(this, repo)), repoConcurrency)
  // eslint-disable-next-line promise/no-native
  await Promise.all(promises)
}

const updateGreenkeeperPullRequest = async function (owner, repo, title, head, number) {
  const pull = await this.createPullRequest(owner, repo, title, head, 'master')

  try {
    await this._octokit.issues.addLabels({ owner, repo, issue_number: pull.number, labels: [ 'greenkeeper' ] })
    await this.closePullRequest(owner, repo, number)
  } catch (error) {
    await this.closePullRequest(owner, repo, pull.number)
  }

  return pull
}

const updateGreenkeeperPullRequestWithLatestVersion = async function (owner, repo, number, head) {
  const [ , , dependency, version ] = /(\w+)\/(.*)-(\d.+)/.exec(head)
  const title = `Update ${dependency} to ${version}`

  return updateGreenkeeperPullRequest.bind(this)(owner, repo, title, head, number)
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

  async mergePullRequest (owner, repo, number, sha) {
    try {
      const { data } = await this._octokit.pulls.merge({ owner, repo, pull_number: number, sha })

      this.emit('pulls:merge', owner, repo, number, sha, data)

      return data
    } catch (error) {
      throw new Error(_.get(error, 'errors[0].message', error.message))
    }
  }

  async getPullRequestComments (owner, repo, number) {
    const options = this._octokit.issues.listComments.endpoint.merge({ owner, repo, issue_number: number })

    const comments = await this._octokit.paginate(options)

    return comments
  }

  async mergeGreenkeeperPullRequests (org, options = { repoConcurrency: 1, pullConcurrency: 1 }) {
    const repos = !org ? await this.getUserRepos() : await this.getOrgRepos(org)
    const owner = !org ? await this.getUser() : org

    await mergeGreenkeeperPullRequests.bind(this)(owner, repos, options)
  }
}

module.exports = GitHubWrapper
