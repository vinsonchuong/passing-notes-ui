#!/usr/bin/env node
import process from 'node:process'
import {createRequire} from 'node:module'
import {spawn} from 'node:child_process'

const require = createRequire(import.meta.url)

spawn(require.resolve('passing-notes/bin.js'), [require.resolve('./app.js')], {
  env: {
    ...process.env,
    UI_PATH: process.argv[2],
  },
  stdio: 'inherit',
})
