import path from 'node:path'
import {promises as fs} from 'node:fs'
import esbuild from 'esbuild'
import {readExports, exportStar, exportStarAndDefault} from '../index.js'

export const cacheDirectory = './node_modules/.cache/passing-notes-ui'
export const entriesDirectory = path.join(cacheDirectory, 'entries')

const compiledModulePathsByOutputDirectory = new Map()

export default async function (modulePaths, outputDirectory, logger) {
  if (!compiledModulePathsByOutputDirectory.has(outputDirectory)) {
    compiledModulePathsByOutputDirectory.set(outputDirectory, new Set())
  }

  const compiledModulePaths =
    compiledModulePathsByOutputDirectory.get(outputDirectory)

  const newModulePaths = setDifference(
    compiledModulePaths,
    new Set(modulePaths),
  )

  if (newModulePaths.size === 0) {
    return
  }

  const logFinish = logger.measure({
    level: 'INFO',
    topic: 'UI',
    message: 'Compiling npm Packages',
  })

  await Promise.all(
    Array.from(newModulePaths).map(async (modulePath) => {
      if (await writeEntry(modulePath, logger)) {
        compiledModulePaths.add(modulePath)
      }
    }),
  )

  await esbuild.build({
    entryPoints: Array.from(compiledModulePaths).map(
      (modulePath) => `${entriesDirectory}/${modulePath}.js`,
    ),
    define: {
      'process.env.NODE_ENV': '"development"',
      global: 'window',
    },
    format: 'esm',
    sourcemap: 'inline',
    bundle: true,
    splitting: true,
    outdir: outputDirectory,
    logLevel: 'silent',
  })

  logFinish({message: 'Finished'})
}

const writtenEntries = new Set()
async function writeEntry(modulePath, logger) {
  if (writtenEntries.has(modulePath)) {
    return true
  }

  const exports = await readExports(modulePath)

  if (!exports) {
    logger.log({
      level: 'WARN',
      topic: 'UI',
      message: `Could not resolve module path: ${modulePath}`,
    })
    return false
  }

  let code
  if (exports === exportStar) {
    code = `export * from '${modulePath}'`
  } else if (exports === exportStarAndDefault) {
    code = `export * from '${modulePath}'; export {default} from '${modulePath}'`
  } else {
    code = `export { ${exports.join(', ')} } from '${modulePath}'`
  }

  await fs.mkdir(path.join(entriesDirectory, path.dirname(modulePath)), {
    recursive: true,
  })
  await fs.writeFile(`${entriesDirectory}/${modulePath}.js`, code)
  writtenEntries.add(modulePath)

  return true
}

function setDifference(setA, setB) {
  const difference = new Set()
  for (const element of setB) {
    if (!setA.has(element)) {
      difference.add(element)
    }
  }

  return difference
}
