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
bundling project source code into a single file. Any npm packages imported via
bare specifiers (e.g. `'react'`) are externalized and bundled separately and
ultimately imported via HTTP:

```javascript
import React from '/npm/react'
```

JavaScript, CSS, and other files from npm packages can be requested directly via
URL:

```html
<link href="/npm/the-new-css-reset/css/reset.css" rel="stylesheet">
```

Currently, `serveUi` compiles as needed on each request. In the future, it may
instead compile only when files change.

### Virtual Files

Optionally, "virtual files" can be specified.

```javascript
import {compose, Logger} from 'passing-notes'
import serveUi from 'passing-notes-ui'

const logger = new Logger()

export default compose(
  serveUi({
    logger,
    path: './ui',
    files: {
      'index.html': `
        <!doctype html>
        <script type="module" src="/index.js"></script>
      `,
      'index.js': `
        import text from './text.js'
        document.body.textContent = text
      `
    }
  }),
  () => () => ({status: 404})
)
```

These virtual files are compiled and served as if they were written directly to
the file system at the given paths.

### Code Splitting

Code splitting is accomplished by having the browser import from different
entry points. A bundle is created for each entry point.

If both bundles end up importing the same file, the code in that file is
duplicated into both bundles.

To prevent such duplication, "boundaries" can be defined. Bundles will never
include files that cross a boundary, leaving them to be imported via HTTP at
runtime.

Here's an intended example use case:

```javascript
import {compose, Logger} from 'passing-notes'
import serveUi from 'passing-notes-ui'

const logger = new Logger()

export default compose(
  serveUi({
    path: './ui',
    boundaries: ['./ui/lib/*'],
    logger
  }),
  () => () => ({status: 404})
)
```

If the main entry point for the app is at `./ui/index.js` and that file imports
`./ui/lib/one/index.js` and `./ui/lib/two/index.js`, three bundles will be
created:

- A bundle including `./ui/lib/one/index.js` and any files it imports from
  within `./ui/lib/one/`
- A bundle including `./ui/lib/two/index.js` and any files it imports from
  within `./ui/lib/two/`
- A bundle including `./ui/index.js` and any files it imports that are outside
  of `./ui/lib`

Note that files within `./ui/lib/one/` should only import files from within
`./ui/lib/one/`. If they import files in outer directories, additional bundles
will be created.

These boundaries should correspond to actual boundaries within the codebase
where imports that cross are strictly controlled.

### Automated Testing

Internally, caches and resources are setup to speed up compilation, which may
prevent the process from exiting, especially in automated test. There is a
`teardown` function that will clean up these caches and resources:

```javascript
import test from 'ava'
import {compose, Logger, startServer, stopServer} from 'passing-notes'
import serveUi, {teardown} from 'passing-notes-ui'

test('serving a UI', async (t) => {
  const logger = new Logger()

  const server = await startServer(
    {port: 10_000},
    compose(
      serveUi({
        logger,
        path: './ui',
        files: {
          'index.html': `
            <!doctype html>
            <script type="module" src="/index.js"></script>
          `,
          'index.js': `
            document.body.textContent = 'Hello World!'
          `
        }
      }),
      () => () => ({status: 404})
    )
  )

  t.teardown(async () => {
    await stopServer(server)
    await teardown()
  })

  t.pass()
})
```
