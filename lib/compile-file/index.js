import {Buffer} from 'node:buffer'
import path from 'node:path'
import esbuild from 'esbuild'

const cache = new Map()
const modulePattern = /^(@[a-z\d-~][a-z\d-._~]*\/)?[a-z\d-~][a-z\d-._~]*(\/.|$)/

export default async function compileFile(
  filePath,
  files = {},
  boundaries = [],
) {
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
              path: `/npm/${args.path}`,
              external: true,
            }
          })
        },
      },
      {
        name: 'virtual-files',
        setup(build) {
          build.onResolve(
            {filter: /\.js$/},
            ({path: importPath, resolveDir, importer}) => {
              if (importPath in files) {
                return {path: importPath, namespace: 'virtual-file'}
              }

              if (importer in files) {
                const pathRelativeToImporter = path.join(
                  path.dirname(importer),
                  importPath,
                )
                return {path: pathRelativeToImporter}
              }

              const pathRelativeToResolveDir = path.join(resolveDir, importPath)
              if (pathRelativeToResolveDir in files) {
                return {
                  path: pathRelativeToResolveDir,
                  namespace: 'virtual-file',
                }
              }

              return null
            },
          )

          build.onLoad(
            {filter: /\.js$/, namespace: 'virtual-file'},
            ({path}) => {
              return {contents: files[path]}
            },
          )
        },
      },
      {
        name: 'boundaries',
        setup(build) {
          build.onResolve({filter: /.*/}, (args) => {
            if (
              modulePattern.test(args.path) ||
              args.kind === 'entry-point' ||
              args.namespace !== 'file'
            ) {
              return
            }

            const absoluteImportPath = path.resolve(args.resolveDir, args.path)

            const importerBoundary = boundaries.find(
              (boundaryDirectory) =>
                !path
                  .relative(boundaryDirectory, args.importer)
                  .startsWith('../'),
            )

            const importBoundary = boundaries.find(
              (boundaryDirectory) =>
                !path
                  .relative(boundaryDirectory, absoluteImportPath)
                  .startsWith('../'),
            )

            return {
              external: importerBoundary !== importBoundary,
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

export async function teardown(directoryPath) {
  if (directoryPath) {
    const absoluteDirectoryPath = path.resolve(directoryPath)

    for (const [filePath, {context}] of cache.entries()) {
      if (filePath.startsWith(absoluteDirectoryPath)) {
        await context.dispose()
      }
    }
  } else {
    for (const {context} of cache.values()) {
      await context.dispose()
    }
  }
}
