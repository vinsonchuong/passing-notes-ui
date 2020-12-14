import path from 'path'
import {promises as fs} from 'fs'
import {withEsbuild, readExports} from '../index.js'

const entriesDirectory = './node_modules/.cache/passing-notes-ui/entries'
const packageDirectory = './node_modules/.cache/passing-notes-ui/packages'

const compiledModulePaths = new Set()

export default withEsbuild(async (esbuild, modulePaths, logger) => {
  const newModulePaths = setDifference(
    compiledModulePaths,
    new Set(modulePaths)
  )

  if (newModulePaths.size === 0) {
    return
  }

  const logFinish = logger.measure({
    level: 'INFO',
    topic: 'UI',
    message: 'Compiling npm Packages'
  })

  await fs.rmdir(packageDirectory, {recursive: true})

  await Promise.all(
    Array.from(newModulePaths).map(async (newModulePath) => {
      const exports = await readExports(newModulePath)

      if (!exports) {
        logger.log({
          level: 'WARN',
          topic: 'UI',
          message: `Could not resolve module path: ${newModulePath}`
        })
        return
      }

      const code =
        exports === '*'
          ? `export * from '${newModulePath}'`
          : `export { ${exports.join(', ')} } from '${newModulePath}'`

      compiledModulePaths.add(newModulePath)

      await fs.mkdir(path.join(entriesDirectory, path.dirname(newModulePath)), {
        recursive: true
      })
      await fs.writeFile(`${entriesDirectory}/${newModulePath}.js`, code)
    })
  )

  await esbuild.build({
    entryPoints: Array.from(compiledModulePaths).map(
      (modulePath) => `${entriesDirectory}/${modulePath}.js`
    ),
    define: {
      'process.env.NODE_ENV': '"development"',
      global: 'window'
    },
    format: 'esm',
    sourcemap: 'inline',
    bundle: true,
    splitting: true,
    outdir: packageDirectory,
    logLevel: 'silent'
  })

  logFinish({message: 'Finished'})
})

function setDifference(setA, setB) {
  const difference = new Set()
  for (const element of setB) {
    if (!setA.has(element)) {
      difference.add(element)
    }
  }

  return difference
}
