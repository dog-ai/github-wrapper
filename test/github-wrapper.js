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

  describe('when creating pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const title = 'my-title'
    const head = 'my-head'
    const base = 'my-base'
    let handler

    beforeEach(() => {
      handler = jest.fn()

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

      subject.on('pulls:create', handler)
    })

    afterEach(() => {
      subject.removeAllListeners()
    })

    it('should create pull request', async () => {
      return subject.createPullRequest(owner, repo, title, head, base)
    })

    it('should emit pulls:create event', async () => {
      await subject.createPullRequest(owner, repo, title, head, base)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('when closing pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 0
    let handler

    beforeEach(() => {
      handler = jest.fn()

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

      subject.on('pulls:close', handler)
    })

    afterEach(() => {
      subject.removeAllListeners()
    })

    it('should close pull request', async () => {
      return subject.closePullRequest(owner, repo, number)
    })

    it('should emit pulls:close event', async () => {
      await subject.closePullRequest(owner, repo, number)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('when merging pull request', () => {
    const owner = 'my-owner'
    const repo = 'my-repo'
    const number = 'my-number'
    const sha = 'my-sha'
    let handler

    beforeEach(() => {
      handler = jest.fn()

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

      subject.on('pulls:merge', handler)
    })

    afterEach(() => {
      subject.removeAllListeners()
    })

    it('should merge pull request', async () => {
      return subject.mergePullRequest(owner, repo, number, sha)
    })

    it('should emit pulls:merge event', async () => {
      await subject.mergePullRequest(owner, repo, number, sha)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('when merging pull requests by greenkeeper', () => {
    const repos = [ { name: 'my-repo' } ]
    let merge

    beforeEach(() => {
      merge = jest.fn().mockImplementation(() => {
        return { data: {} }
      })
    })

    describe('when it was not verified by greenkeeper', () => {
      const login = 'my-login'
      const pulls = [ { head: { sha: 'my-sha' }, user: { login: 'greenkeeper[bot]' } } ]
      const data = { state: 'success', statuses: [ ] }

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

      it('should not merge pull request', async () => {
        await subject.mergeGreenkeeperPullRequests()

        expect(merge).toHaveBeenCalledTimes(0)
      })
    })

    describe('when user pull requests', () => {
      const login = 'my-login'
      const pulls = [ { head: { sha: 'my-sha' }, user: { login: 'greenkeeper[bot]' } } ]
      const data = { state: 'success', statuses: [ { context: 'greenkeeper/verify', state: 'success' } ] }

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
      const pulls = [ { head: { sha: 'my-sha' }, user: { login: 'greenkeeper[bot]' } } ]
      const data = { state: 'success', statuses: [ { context: 'greenkeeper/verify', state: 'success' } ] }

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

    describe('when pull request combined status is not success', () => {
      const login = 'my-login'
      const repo = 'my-repo'
      const pulls = [ { head: { sha: 'my-sha' }, user: { login: 'greenkeeper[bot]' }, number: 0 } ]
      const data = { state: 'failure', statuses: [ { context: 'greenkeeper/verify', state: 'success' } ] }
      const comments = [ { user: { login: 'greenkeeper[bot]' }, body: `...${login}:${repo}/my-dependency-0.0.0)` } ]
      let create
      let addLabels
      let update

      beforeEach(() => {
        create = jest.fn().mockImplementation(() => {
          return { data: {} }
        })
        addLabels = jest.fn()
        update = jest.fn()

        Octokit = require('@octokit/rest')
        jest.mock('@octokit/rest')

        const paginate = jest.fn()
        paginate.mockReturnValueOnce(repos)
        paginate.mockReturnValueOnce(pulls)
        paginate.mockReturnValueOnce(comments)

        Octokit.mockImplementation(() => {
          return {
            paginate,
            users: {
              getAuthenticated: jest.fn().mockImplementation(() => {
                return { data: { login } }
              })
            },
            pulls: {
              create,
              update,
              list: {
                endpoint: {
                  merge: jest.fn()
                }
              }
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
            },
            issues: {
              addLabels,
              listComments: {
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

      it('should create a new pull request', async () => {
        await subject.mergeGreenkeeperPullRequests()

        expect(create).toHaveBeenCalledTimes(1)
      })

      it('should add greenkeeper label to pull request', async () => {
        await subject.mergeGreenkeeperPullRequests()

        expect(addLabels).toHaveBeenCalledTimes(1)
      })

      it('should close old pull request', async () => {
        await subject.mergeGreenkeeperPullRequests()

        expect(update).toHaveBeenCalledTimes(1)
        expect(update).toHaveBeenCalledWith({ owner: login, repo, pull_number: pulls[ 0 ].number, state: 'closed' })
      })
    })
  })
})
