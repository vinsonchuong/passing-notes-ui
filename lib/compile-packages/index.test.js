import path from 'node:path'
import fs from 'node:fs/promises'
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
  t.is(typeof pify, 'function')
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
  t.is(typeof pEvent, 'function')
  t.is(typeof pEventIterator, 'function')
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
    version: '18.3.1',
  })
})

test('compiling packages export subdirectories', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(
    ['solid-js/web', 'solid-js/html'],
    directory.path,
    logger,
  )

  const {render} = await import(
    path.resolve(directory.path, 'solid-js', 'web.js')
  )
  t.is(typeof render, 'function')

  const {default: html} = await import(
    path.resolve(directory.path, 'solid-js', 'html.js')
  )
  t.is(typeof html, 'function')
})

test('compiling packages that conditionally import from Node', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['recast'], directory.path, logger)

  t.pass()
})

test('also compiling CSS files', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(
    ['@wooorm/starry-night/style/core.css'],
    directory.path,
    logger,
  )

  const compiledFile = await fs.readFile(
    path.resolve(directory.path, '@wooorm/starry-night/style/core.css'),
    'utf8',
  )
  t.true(
    compiledFile.includes('color: var(--color-prettylights-syntax-comment);'),
  )
})

test('compiling files within pakages', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile(
    'package.json',
    JSON.stringify({name: 'cache', private: true, type: 'module'}),
  )

  const logger = new Logger()
  logger.on('log', (entry) => {
    t.log(entry)
  })

  await compilePackages(['lodash/isNull.js'], directory.path, logger)

  const {default: isNull} = await import(
    path.resolve(directory.path, 'lodash/isNull.js')
  )
  t.is(typeof isNull, 'function')
})
