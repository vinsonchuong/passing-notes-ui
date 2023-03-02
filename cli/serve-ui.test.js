import process from 'node:process'
import test from 'ava'
import {useTemporaryDirectory, runProcess} from 'ava-patterns'
import install from 'quick-install'
import {openChrome} from 'puppet-strings-chrome'
import {closeBrowser, openTab, findElement} from 'puppet-strings'

test('quickly serving a UI from the command line', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    `
    {
      "scripts": {
        "start": "serve-ui ."
      }
    }
  `,
  )
  await install(process.cwd(), directory.path)
  await directory.writeFile(
    'index.html',
    `
    <!doctype html>
    <meta charset="utf-8">
    <div>Hello World!</div>
  `,
  )

  const server = runProcess(t, {
    command: ['npm', 'start'],
    cwd: directory.path,
    env: {
      PORT: '10100',
    },
  })

  await server.waitForOutput('Listening', 5000)

  const browser = await openChrome()
  t.teardown(async () => {
    await closeBrowser(browser)
  })

  const tab = await openTab(browser, 'http://localhost:10100', {
    timeout: 10_000,
  })
  await findElement(tab, 'div', 'Hello World!')

  t.pass()
})
