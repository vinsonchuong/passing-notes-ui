import test from 'ava'
import {useTemporaryDirectory} from 'ava-patterns'
import {
  closeBrowser,
  openTab,
  navigate,
  findElement,
  evalInTab,
} from 'puppet-strings'
import {openChrome} from 'puppet-strings-chrome'
import {startServer, stopServer, compose, Logger} from 'passing-notes'
import serveUi from './index.js'

test('serving a UI during development', async (t) => {
  const browser = await openChrome()
  t.teardown(async () => {
    await closeBrowser(browser)
  })

  const directory = await useTemporaryDirectory(t)

  const logger = new Logger()
  const logs = []
  logger.on('log', (entry) => {
    t.log(entry)
    logs.push(entry)
  })

  const server = await startServer(
    {port: 10_001},
    compose(serveUi({path: directory.path, logger}), () => () => ({
      status: 404,
    })),
  )
  t.teardown(async () => {
    await stopServer(server)
  })

  await directory.writeFile(
    'index.html',
    `
    <!doctype html>
    <meta charset="utf-8">
    <title>App</title>
    <script type="module" src="/index.js"></script>
    <div id="app-container"></div>
  `,
  )

  await directory.writeFile(
    'index.js',
    `
    document.querySelector('#app-container').textContent = 'Hello World!'
  `,
  )

  const tab = await openTab(browser, 'http://localhost:10001', {
    timeout: 10_000,
  })
  await findElement(tab, 'div', 'Hello World!')

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react'
    import {render} from 'react-dom'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `,
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10_000})
  await findElement(tab, 'div', 'Hello React!')

  t.is(logs.length, 4)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})
  t.like(logs.shift(), {message: 'Compiling npm Packages'})
  t.like(logs.shift(), {message: 'Compiling npm Packages › Finished'})

  await navigate(tab, 'http://localhost:10001', {timeout: 10_000})
  await findElement(tab, 'div', 'Hello React!')

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react'
    import {render} from 'react-dom'
    import something from 'missing-package'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `,
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10_000})

  t.is(logs.length, 5)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})
  t.like(logs.shift(), {message: 'Compiling npm Packages'})
  t.like(logs.shift(), {
    message: 'Could not resolve module path: missing-package',
  })
  t.like(logs.shift(), {message: 'Compiling npm Packages › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react'
    import {render} from 'react-dom'

    import badSyntax of 'something'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `,
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10_000})

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {level: 'ERROR'})
})

test('providing additional files as strings', async (t) => {
  const directory = await useTemporaryDirectory(t)

  const browser = await openChrome()
  t.teardown(async () => {
    await closeBrowser(browser)
  })

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  const server = await startServer(
    {port: 10_002},
    compose(
      serveUi({
        path: directory.path,
        files: {
          'index.html': `
            <!doctype html>
            <meta charset="utf-8">
            <script type="module" src="/index.js"></script>
            <div id="app"></div>
          `,
          'index.js': `
            import text from './text.js'
            document.querySelector('#app').textContent = text
          `,
          'other.js': `
            export default 'World!'
          `,
        },
        logger,
      }),
      () => () => ({status: 404}),
    ),
  )
  t.teardown(async () => {
    await stopServer(server)
  })

  await directory.writeFile(
    'text.js',
    `
    import otherText from './other.js'
    export default 'Hello ' + otherText
  `,
  )

  const tab = await openTab(browser, 'http://localhost:10002', {
    timeout: 10_000,
  })
  await findElement(tab, 'div', 'Hello World!')

  await directory.writeFile(
    'text.js',
    `
    export default 'Bye Now!'
  `,
  )

  await navigate(tab, 'http://localhost:10002', {timeout: 10_000})
  await findElement(tab, 'div', 'Bye Now!')

  t.pass()
})

test('serving CSS files exported by npm packages', async (t) => {
  const browser = await openChrome()
  t.teardown(async () => {
    await closeBrowser(browser)
  })

  const directory = await useTemporaryDirectory(t)

  const logger = new Logger()
  const logs = []
  logger.on('log', (entry) => {
    t.log(entry)
    logs.push(entry)
  })

  const server = await startServer(
    {port: 10_003},
    compose(serveUi({path: directory.path, logger}), () => () => ({
      status: 404,
    })),
  )
  t.teardown(async () => {
    await stopServer(server)
  })

  await directory.writeFile(
    'index.html',
    `
    <!doctype html>
    <meta charset="utf-8">
    <title>App</title>
    <link href="/npm/the-new-css-reset/css/reset.css" rel="stylesheet">
    <h1>Hello World!</h1>
  `,
  )

  const tab = await openTab(browser, 'http://localhost:10003', {
    timeout: 10_000,
  })
  await findElement(tab, 'h1')
  t.is(
    await evalInTab(
      tab,
      [],
      `
      const h1 = document.querySelector('h1')
      const styles = window.getComputedStyle(h1)
      return styles['font-size']
    `,
    ),
    '16px',
  )
})

// eslint-disable-next-line ava/no-skip-test
test.skip('importing packages that rely on Node builtins', async (t) => {
  const browser = await openChrome()
  t.teardown(async () => {
    await closeBrowser(browser)
  })

  const directory = await useTemporaryDirectory(t)

  const logger = new Logger()
  const logs = []
  logger.on('log', (entry) => {
    t.log(entry)
    logs.push(entry)
  })

  const server = await startServer(
    {port: 10_004},
    compose(serveUi({path: directory.path, logger}), () => () => ({
      status: 404,
    })),
  )
  t.teardown(async () => {
    await stopServer(server)
  })

  await directory.writeFile(
    'index.html',
    `
    <!doctype html>
    <meta charset="utf-8">
    <title>App</title>
    <script type="module" src="/index.js"></script>
  `,
  )
  await directory.writeFile(
    'index.js',
    `
    import * as recast from 'recast'
    document.body.textContent = 'Import Successful'
  `,
  )

  const tab = await openTab(browser, 'http://localhost:10004', {
    timeout: 10_000,
  })

  try {
    await findElement(tab, 'body', 'Import Successful')
  } catch (error) {
    console.log(tab)
    throw error
  }

  t.pass()
})
