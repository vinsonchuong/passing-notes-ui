import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'ava'
import {Logger} from 'passing-notes'
import compilePackages, {entriesDirectory, packageDirectory} from './index.js'

test.before(async (t) => {
  const cacheDirectory = path.resolve('node_modules', '.cache')
  await fs.rm(cacheDirectory, {
    force: true,
    recursive: true,
  })
  await fs.mkdir(cacheDirectory)
  await fs.writeFile(
    path.join(cacheDirectory, 'package.json'),
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['pify', 'p-event', 'react'], logger)
})

test('compiling packages that are ES modules with default exports', async (t) => {
  {
    const {default: pify} = await import(
      path.resolve(entriesDirectory, 'pify.js')
    )
    t.is(pify.name, 'pify')
  }

  {
    const {default: pify} = await import(
      path.resolve(packageDirectory, 'pify.js')
    )
    t.is(pify.name, 'pify')
  }
})

test('compiling packages that are ES modules with only named exports', async (t) => {
  {
    const {pEvent, pEventIterator} = await import(
      path.resolve(entriesDirectory, 'p-event.js')
    )
    t.is(pEvent.name, 'pEvent')
    t.is(pEventIterator.name, 'pEventIterator')
  }

  {
    const {pEvent, pEventIterator} = await import(
      path.resolve(packageDirectory, 'p-event.js')
    )
    t.is(pEvent.name, 'pEvent')
    t.is(pEventIterator.name, 'pEventIterator')
  }
})

test('compiling packages that are CJS modules', async (t) => {
  t.like(await import(path.resolve(entriesDirectory, 'react.js')), {
    version: '18.2.0',
  })
  t.like(await import(path.resolve(packageDirectory, 'react.js')), {
    version: '18.2.0',
  })
})
