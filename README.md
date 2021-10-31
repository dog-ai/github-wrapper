# A :octocat: GitHub :package: wrapper library

[![](https://github.com/dog-ai/github-wrapper/workflows/ci/badge.svg)](https://github.com/dog-ai/github-wrapper/actions?workflow=ci)
[![Coverage Status](https://coveralls.io/repos/github/dog-ai/github-wrapper/badge.svg?branch=master)](https://coveralls.io/github/dog-ai/github-wrapper?branch=master)
[![](https://img.shields.io/github/release/dog-ai/github-wrapper.svg)](https://github.com/dog-ai/github-wrapper/releases)
[![Version](https://img.shields.io/npm/v/@dog-ai/github-wrapper.svg)](https://www.npmjs.com/package/@dog-ai/github-wrapper)
[![Downloads](https://img.shields.io/npm/dt/@dog-ai/github-wrapper.svg)](https://www.npmjs.com/package/@dog-ai/github-wrapper)

> A GitHub wrapper library.

### Features
* Uses [GitHub REST API client for JavaScript](https://github.com/octokit/rest.js) :octocat: :white_check_mark:

### How to install
```
npm install @dog-ai/github-wrapper
```

### How to use

#### Use it in your app
```javascript
const GitHub = require('github-wrapper')
const github = new GitHub({ octokit: { auth: 'my-personal-token' } })

github.getOrgRepos('dog-ai')
  .then((repos) => repos.forEach(({ name }) => console.log(name)))
```
