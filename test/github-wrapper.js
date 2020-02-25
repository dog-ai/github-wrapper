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
          checks: {
            listForRef: jest.fn().mockImplementation(async () => {
              return { data }
            })
          },
          paginate: jest.fn().mockImplementation(() => data),
          pulls: {
            list: {
              endpoint: {
                merge: jest.fn()
              }
            }
          },
          repos: {
            getCombinedStatusForRef: jest.fn().mockImplementation(async () => {
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

  describe('when creating pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const title = 'my-title'
    const head = 'my-head'
    const base = 'my-base'

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          pulls: {
            create: jest.fn().mockImplementation(() => {
              return {}
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should create pull request', async () => {
      return subject.createPullRequest(owner, repo, title, head, base)
    })
  })

  describe('when closing pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 0

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          pulls: {
            update: jest.fn().mockImplementation(() => {
              return {}
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should close pull request', async () => {
      return subject.closePullRequest(owner, repo, number)
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
            merge: jest.fn().mockImplementation(() => {
              return {}
            })
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

  describe('when reviewing pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const commitId = 'my-commit-id'
    const event = 'my-event'

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          pulls: {
            createReview: jest.fn().mockImplementation(() => {
              return {}
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should review pull request', async () => {
      return subject.reviewPullRequest(owner, repo, number, commitId, event)
    })
  })

  describe('when listing pull request reviews', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const data = []

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          paginate: jest.fn().mockImplementation(() => data),
          pulls: {
            listReviews: {
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

    it('should list pull request reviews', async () => {
      const result = await subject.listPullRequestReviews(owner, repo, number)

      expect(result).toEqual(data)
    })
  })

  describe('when requesting pull request review', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          pulls: {
            createReviewRequest: jest.fn().mockImplementation(() => {
              return {}
            })
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should requesting pull request review', async () => {
      return subject.requestPullRequestReview(owner, repo, number)
    })
  })

  describe('when getting pull request comments', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const data = []

    beforeEach(() => {
      Octokit = require('@octokit/rest')
      jest.mock('@octokit/rest')

      Octokit.mockImplementation(() => {
        return {
          paginate: jest.fn().mockImplementation(() => data),
          issues: {
            listComments: {
              endpoint: {
                merge: jest.fn().mockImplementation(() => {
                  return {}
                })
              }
            }
          }
        }
      })

      const GitHubWrapper = require('../src/github-wrapper')
      subject = new GitHubWrapper()
    })

    it('should getting pull request comments', async () => {
      const result = await subject.getPullRequestComments(owner, repo, number)

      expect(result).toEqual(data)
    })
  })
})
