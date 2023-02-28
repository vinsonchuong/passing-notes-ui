import {Buffer} from 'node:buffer'
import esbuild from 'esbuild'

const cache = new Map()
const modulePattern = /^(@[a-z\d-~][a-z\d-._~]*\/)?[a-z\d-~][a-z\d-._~]*(\/.|$)/

export default async function (filePath) {
  if (cache.has(filePath)) {
    const {dependencies, context} = cache.get(filePath)

    dependencies.clear()
    const newResult = await context.rebuild()

    return {
      code: Buffer.from(newResult.outputFiles[0].contents),
      dependencies: Array.from(dependencies),
    }
  }

  const dependencies = new Set()
  const context = await esbuild.context({
    entryPoints: [filePath],
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    format: 'esm',
    sourcemap: 'inline',
    bundle: true,
    write: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'externalize-packages',
        setup(build) {
          build.onResolve({filter: modulePattern}, (args) => {
            dependencies.add(args.path)

            return {
              path: `/npm/${args.path}.js`,
              external: true,
            }
          })
        },
      },
    ],
  })

  cache.set(filePath, {context, dependencies})

  const result = await context.rebuild()
  return {
    code: Buffer.from(result.outputFiles[0].contents),
    dependencies: Array.from(dependencies),
  }
}