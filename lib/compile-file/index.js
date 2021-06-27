import esbuild from 'esbuild'

const cache = new Map()
const modulePattern = /^(@[a-z\d-~][a-z\d-._~]*\/)?[a-z\d-~][a-z\d-._~]*(\/.|$)/

export default async function (filePath) {
  if (cache.has(filePath)) {
    const {dependencies, result} = cache.get(filePath)

    dependencies.clear()
    const newResult = await result.rebuild()

    return {
      code: Buffer.from(newResult.outputFiles[0].contents),
      dependencies: Array.from(dependencies)
    }
  }

  const dependencies = new Set()
  const result = await esbuild.build({
    entryPoints: [filePath],
    define: {
      'process.env.NODE_ENV': '"development"'
    },
    format: 'esm',
    sourcemap: 'inline',
    bundle: true,
    write: false,
    incremental: true,
    logLevel: 'silent',
    plugins: [
      {
        name: 'externalize-packages',
        setup(build) {
          build.onResolve({filter: modulePattern}, (args) => {
            dependencies.add(args.path)

            return {
              path: `/npm/${args.path}.js`,
              external: true
            }
          })
        }
      }
    ]
  })

  cache.set(filePath, {result, dependencies})

  return {
    code: Buffer.from(result.outputFiles[0].contents),
    dependencies: Array.from(dependencies)
  }
}
