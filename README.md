# A GitHub wrapper

[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Build Status](https://travis-ci.org/dog-ai/github-wrapper.svg?branch=master)](https://travis-ci.org/dog-ai/github-wrapper)
[![Coverage Status](https://coveralls.io/repos/github/dog-ai/github-wrapper/badge.svg?branch=master)](https://coveralls.io/github/dog-ai/github-wrapper?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/dog-ai/github-wrapper.svg)](https://greenkeeper.io/)
[![](https://img.shields.io/github/release/dog-ai/github-wrapper.svg)](https://github.com/dog-ai/github-wrapper/releases)

A GitHub wrapper.

### Features
* Supports [Bluebird](https://github.com/petkaantonov/bluebird) :bird: promises :white_check_mark:

### How to install
```
npm install @dog-ai/github-wrapper -g
```

### How to use

#### Use it in your app
```javascript
const GitHub = require('github-wrapper')
const github = new GitHub({ auth: { type: 'token', token: 'my-token' } })

return github.getOrgRepos('dog-ai')
    .mapSeries((repo) => console.log(repo.name))
```
