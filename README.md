# A :octocat: GitHub :package: wrapper library

[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/dog-ai/github-wrapper.svg?branch=master)](https://travis-ci.org/dog-ai/github-wrapper)
[![Coverage Status](https://coveralls.io/repos/github/dog-ai/github-wrapper/badge.svg?branch=master)](https://coveralls.io/github/dog-ai/github-wrapper?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/dog-ai/github-wrapper.svg)](https://greenkeeper.io/)
[![](https://img.shields.io/github/release/dog-ai/github-wrapper.svg)](https://github.com/dog-ai/github-wrapper/releases)
[![](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/npm/v/@dog-ai/github-wrapper.svg)](https://www.npmjs.com/package/@dog-ai/github-wrapper)
[![Downloads](https://img.shields.io/npm/dt/@dog-ai/github-wrapper.svg)](https://www.npmjs.com/package/@dog-ai/github-wrapper) 

A GitHub wrapper library.

### Features
* Supports [Bluebird](https://github.com/petkaantonov/bluebird) :bird: promises :white_check_mark:

### How to install
```
npm install @dog-ai/github-wrapper
```

### How to use

#### Use it in your app
```javascript
const GitHub = require('github-wrapper')
const github = new GitHub({ github: { token: 'my-token' } })

return github.getOrgRepos('dog-ai')
    .mapSeries((repo) => console.log(repo.name))
```
