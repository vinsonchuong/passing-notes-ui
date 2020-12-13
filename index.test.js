import test from 'ava'
import {useTemporaryDirectory} from 'ava-patterns'
import {closeBrowser, openTab, navigate, findElement} from 'puppet-strings'
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
  logger.on('log', (entry) => logs.push(entry))

  const server = await startServer(
    {port: 10001},
    compose(serveUi({path: directory.path, logger}), () => () => ({
      status: 404
    }))
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
  `
  )

  await directory.writeFile(
    'index.js',
    `
    document.querySelector('#app-container').textContent = 'Hello World!'
  `
  )

  const tab = await openTab(browser, 'http://localhost:10001', {timeout: 10000})
  await findElement(tab, 'div', 'Hello World!')

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react/index.mjs'
    import {render} from 'react-dom'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10000})
  await findElement(tab, 'div', 'Hello React!')

  t.is(logs.length, 4)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})
  t.like(logs.shift(), {message: 'Compiling npm Packages'})
  t.like(logs.shift(), {message: 'Compiling npm Packages › Finished'})

  await navigate(tab, 'http://localhost:10001', {timeout: 10000})
  await findElement(tab, 'div', 'Hello React!')

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react/index.mjs'
    import {render} from 'react-dom'
    import something from 'missing-package'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10000})

  t.is(logs.length, 5)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {message: 'Compiling UI › Finished'})
  t.like(logs.shift(), {message: 'Compiling npm Packages'})
  t.like(logs.shift(), {
    message: 'Could not resolve module path: missing-package'
  })
  t.like(logs.shift(), {message: 'Compiling npm Packages › Finished'})

  await directory.writeFile(
    'index.js',
    `
    import {html} from 'htm/react/index.mjs'
    import {render} from 'react-dom'

    import badSyntax of 'something'

    render(
      html\`<span>Hello React!</span>\`,
      document.querySelector('#app-container')
    )
  `
  )

  await navigate(tab, 'http://localhost:10001', {timeout: 10000})

  t.is(logs.length, 2)
  t.like(logs.shift(), {message: 'Compiling UI'})
  t.like(logs.shift(), {level: 'ERROR'})
})
