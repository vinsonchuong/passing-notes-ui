# passing-notes-ui
[![npm](https://img.shields.io/npm/v/passing-notes-ui.svg)](https://www.npmjs.com/package/passing-notes-ui)
[![CI Status](https://github.com/vinsonchuong/passing-notes-ui/workflows/CI/badge.svg)](https://github.com/vinsonchuong/passing-notes-ui/actions?query=workflow%3ACI)
[![dependencies Status](https://david-dm.org/vinsonchuong/passing-notes-ui/status.svg)](https://david-dm.org/vinsonchuong/passing-notes-ui)
[![devDependencies Status](https://david-dm.org/vinsonchuong/passing-notes-ui/dev-status.svg)](https://david-dm.org/vinsonchuong/passing-notes-ui?type=dev)

A middleware for delivering code to the browser during development

It leverages native support for ES modules to avoid the overhead in writing
large bundles. npm packages are compiled to separate, standalone ESM files and
cached by the browser. Application code is built and bundled incrementally.

It uses [esbuild](https://esbuild.github.io/) under the hood and has limited
support for non-standard JavaScript features.

## Usage
Install [passing-notes-ui](https://www.npmjs.com/package/passing-notes-ui)
by running:

```sh
yarn add passing-notes-ui
```

Given a directory (say, `./ui`) containing HTML, CSS, and JS files, we provide
several ways to serve them over HTTP.

To quickly start a server that does nothing aside from serving those files:

```bash
yarn serve-ui ./ui
```

To add this functionality as a middleware to an existing app:

```javascript
import {compose, Logger} from 'passing-notes'
import serveUi from 'passing-notes-ui'

const logger = new Logger()

export default compose(
  serveUi({path: './ui', logger}),
  () => () => ({status: 404})
)
```

`serveUi` will compile any JavaScript (`.js`) files requested by the browser,
also compiling npm packages as needed. Other files are served as static files.

Currently, `serveUi` compiles as needed on each request. In the future, it may
instead compile only when files change.
