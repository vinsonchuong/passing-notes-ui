import process from 'node:process'
import {promises as fs} from 'node:fs'
import path from 'node:path'
import * as cjs from 'cjs-module-lexer'
import * as es from 'es-module-lexer'
import {resolveModulePath} from '../index.js'

let lexerInitialized = false

export const exportStar = ['*']
export const exportStarAndDefault = ['default', '*']

export default async function (modulePath) {
  if (!lexerInitialized) {
    await Promise.all([cjs.init(), es.init])
    lexerInitialized = true
  }

  const fileSystem = new CachedFs()

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
      const fileContents = await fileSystem.read(currentPath)
      const results = cjs.parse(fileContents)
      exports.push(...results.exports)
      for (const reexport of results.reexports) {
        paths.push(await resolveModulePath(path.dirname(currentPath), reexport))
      }
    }

    return exports
  } catch {
    const fileContents = await fileSystem.read(filePath)
    const [, exports] = es.parse(fileContents)
    const hasDefaultExport = exports.some((e) => e.n === 'default')
    return hasDefaultExport ? exportStarAndDefault : exportStar
  }
}

class CachedFs {
  #cache = new Map()

  async read(filePath) {
    if (this.#cache.has(filePath)) {
      return this.#cache.get(filePath)
    }

    const fileContents = await fs.readFile(filePath, 'utf8')
    this.#cache.set(filePath, fileContents)
    return fileContents
  }
}
