/*
 * Copyright (C) 2019, Hugo Freire <hugo@dog.ai>. All rights reserved.
 */

describe('GitHubWrapper', () => {
  let subject
  let Octokit

  describe('when getting user', () => {
    const login = 'my-login'

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          users: {
            getAuthenticated: jest.fn().mockImplementation(() => {
              return { data: { login } }
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should return user', async () => {
      const result = await subject.getUser()

      expect(result).toBe(login)
    })
  })

  describe('when getting user repos', () => {
    const data = []

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      beforeEach(() => {
        Octokit.mockImplementation(() => {
          return {
            paginate: jest.fn().mockImplementation(() => data),
            repos: {
              list: {
                endpoint: {
                  merge: jest.fn()
                }
              }
            }
          }
        })

        const GitHubWrapper = require('../src/github-wrapper')
        subject = new GitHubWrapper()
      })

      it('should get user repos', async () => {
        const result = await subject.getUserRepos()

        expect(result).toEqual(data)
      })
    })
  })

  describe('when getting user organizations', () => {
    const org = 'my-organization'
    const data = [ { login: org } ]

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          paginate: jest.fn().mockImplementation(() => data),
          orgs: {
            listForAuthenticatedUser: {
              endpoint: {
                merge: jest.fn()
              }
            }
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should return organization', async () => {
      const result = await subject.getUserOrgs()

      expect(result).toContain(org)
    })
  })

  describe('when getting organization repos', () => {
    const org = 'my-org'
    const data = []

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          paginate: jest.fn().mockImplementation(() => data),
          repos: {
            listForOrg: {
              endpoint: {
                merge: jest.fn()
              }
            }
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should get organization repos', async () => {
      const result = await subject.getOrgRepos(org)

      expect(result).toEqual(data)
    })
  })

  describe('when getting repo pull requests by state', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const state = 'my-state'
    const sha = 'my-sha'
    const data = [ { head: sha } ]

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          paginate: jest.fn().mockImplementation(() => data),
          pulls: {
            list: {
              endpoint: {
                merge: jest.fn()
              }
            }
          },
          repos: {
            getCombinedStatusForRef: jest.fn().mockImplementation(() => {
              return { data }
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should merge pull request', async () => {
      const result = await subject.getRepoPullRequestsByState(owner, repo, state)

      expect(result).toHaveLength(data.length)
    })
  })

  describe('when merging pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const sha = 'my-sha'

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          pulls: {
            merge: jest.fn()
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should merge pull request', async () => {
      return subject.mergePullRequest(owner, repo, number, sha)
    })
  })

  describe('when merging pull requests by greenkeeper', () => {
    const repos = [ { name: 'my-repo' } ]
    const pulls = [ { head: { sha: 'my-sha' }, user: { login: 'greenkeeper[bot]' } } ]
    const data = { state: 'success', statuses: [ { context: 'greenkeeper/verify', state: 'success' } ] }
    let merge

    beforeEach(() => {
      merge = jest.fn()
    })

    describe('when user pull requests', () => {
      const login = 'my-login'

      beforeEach(() => {
        Octokit = require('@octokit/rest')
        jest.mock('@octokit/rest')

        const paginate = jest.fn()
        paginate.mockReturnValueOnce(repos)
        paginate.mockReturnValueOnce(pulls)

        Octokit.mockImplementation(() => {
          return {
            paginate,
            users: {
              getAuthenticated: jest.fn().mockImplementation(() => {
                return { data: { login } }
              })
            },
            pulls: {
              list: {
                endpoint: {
                  merge: jest.fn()
                }
              },
              merge
            },
            repos: {
              list: {
                endpoint: {
                  merge: jest.fn()
                }
              },
              getCombinedStatusForRef: jest.fn().mockImplementation(() => {
                return { data }
              })
            }
          }
        })

        const GitHubWrapper = require('../src/github-wrapper')
        subject = new GitHubWrapper()
      })

      it('should merge pull request', async () => {
        await subject.mergeGreenkeeperPullRequests()

        expect(merge).toHaveBeenCalledTimes(1)
      })
    })

    describe('when organization pull requests', () => {
      const org = 'my-org'

      beforeEach(() => {
        Octokit = require('@octokit/rest')
        jest.mock('@octokit/rest')

        const paginate = jest.fn()
        paginate.mockReturnValueOnce(repos)
        paginate.mockReturnValueOnce(pulls)

        Octokit.mockImplementation(() => {
          return {
            paginate,
            pulls: {
              list: {
                endpoint: {
                  merge: jest.fn()
                }
              },
              merge
            },
            repos: {
              listForOrg: {
                endpoint: {
                  merge: jest.fn()
                }
              },
              getCombinedStatusForRef: jest.fn().mockImplementation(() => {
                return { data }
              })
            }
          }
        })

        const GitHubWrapper = require('../src/github-wrapper')
        subject = new GitHubWrapper()
      })

      it('should merge pull request', async () => {
        await subject.mergeGreenkeeperPullRequests(org)

        expect(merge).toHaveBeenCalledTimes(1)
      })
    })
  })
})
