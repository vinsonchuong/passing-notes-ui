import {promises as fs} from 'node:fs'
import path from 'node:path'
import {init, parse} from 'cjs-module-lexer'
import {resolveModulePath} from '../index.js'

let lexerInitialized = false

export default async function (modulePath) {
  if (!lexerInitialized) {
    await init()
    lexerInitialized = true
  }

  const cwd = process.cwd()

  const filePath = await resolveModulePath(cwd, modulePath)
  if (!filePath) {
    return null
  }

  try {
    const exports = ['default']
    const paths = [filePath]
    while (paths.length > 0) {
      const currentPath = paths.pop()
      const results = parse(await fs.readFile(currentPath, 'utf8'))
      exports.push(...results.exports)
      for (const reexport of results.reexports) {
        paths.push(await resolveModulePath(path.dirname(currentPath), reexport))
      }
    }

    return exports
  } catch {
    return '*'
  }
}
