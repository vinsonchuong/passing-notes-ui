import process from 'node:process'
import path from 'node:path'
import test from 'ava'
import resolveModulePath from './index.js'

test('can resolve react (uses default)', async (t) => {
  t.is(
    await resolveModulePath(process.cwd(), 'react'),
    path.resolve('node_modules/react/index.js'),
  )
})

test('can resolve htm (uses browser)', async (t) => {
  t.is(
    await resolveModulePath(process.cwd(), 'htm'),
    path.resolve('node_modules/htm/dist/htm.module.js'),
  )
})

test('can resolve goober (uses import)', async (t) => {
  t.is(
    await resolveModulePath(process.cwd(), 'goober'),
    path.resolve('node_modules/goober/dist/goober.modern.js'),
  )
})
