import path from 'node:path'
import test from 'ava'
import {Logger} from 'passing-notes'
import {useTemporaryDirectory} from 'ava-patterns'
import compilePackages from './index.js'

test('compiling packages that are ES modules with default exports', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['pify'], directory.path, logger)

  const {default: pify} = await import(path.resolve(directory.path, 'pify.js'))
  t.is(pify.name, 'pify')
})

test('compiling packages that are ES modules with only named exports', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['p-event'], directory.path, logger)

  const {pEvent, pEventIterator} = await import(
    path.resolve(directory.path, 'p-event.js')
  )
  t.is(pEvent.name, 'pEvent')
  t.is(pEventIterator.name, 'pEventIterator')
})

test('compiling packages that are CJS modules', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['react'], directory.path, logger)

  t.like(await import(path.resolve(directory.path, 'react.js')), {
    version: '18.2.0',
  })
})
