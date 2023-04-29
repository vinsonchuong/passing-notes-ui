import path from 'node:path'
import serveStatic from 'passing-notes-static'
import flowRight from 'lodash/flowRight.js'
import stripIndent from 'strip-indent'
import slugify from '@sindresorhus/slugify'
import {compileFile, compilePackages, formatFrame} from './lib/index.js'

const packageDirectory = './node_modules/.cache/passing-notes-ui/packages'

export default function ({path: directory, files = {}, logger}) {
  const packageSubdirectory = path.join(packageDirectory, slugify(directory))

  const virtualFiles = {}
  for (const [filePath, fileContents] of Object.entries(files)) {
    virtualFiles[path.join(directory, filePath)] = stripIndent(fileContents)
  }

  const dependencies = new Set()
  const modulePattern =
    /^(@[a-z\d-~][a-z\d-._~]*\/)?[a-z\d-~][a-z\d-._~]*(\/.|$)/

  return flowRight(
    (next) => async (request) => {
      if (
        !request.url.startsWith('/npm/') ||
        request.url.startsWith('/npm/_chunks/')
      ) {
        return next(request)
      }

      const modulePath = request.url.slice(5)
      if (!modulePattern.test(modulePath)) {
        return {status: 404}
      }

      if (!dependencies.has(modulePath)) {
        dependencies.add(modulePath)
        await compilePackages(dependencies, packageSubdirectory, logger)
      }

      return next({
        ...request,
        url:
          path.extname(request.url) === '' ? `${request.url}.js` : request.url,
      })
    },
    serveStatic(packageSubdirectory, '/npm'),
    (next) => async (request) => {
      if (request.url.startsWith('/npm/')) {
        return {status: 404}
      }

      if (!request.url.endsWith('.js')) {
        return next(request)
      }

      const filePath = path.join(directory, request.url)

      try {
        const finishCompileFile = logger.measure({
          level: 'INFO',
          topic: 'UI',
          message: 'Compiling UI',
        })
        const {code, dependencies: bundleDependencies} = await compileFile(
          filePath,
          virtualFiles,
        )
        for (const dependency of bundleDependencies) {
          dependencies.add(dependency)
        }

        finishCompileFile({message: 'Finished'})

        await compilePackages(bundleDependencies, packageSubdirectory, logger)

        return {
          status: 200,
          headers: {
            'content-length': `${code.length}`,
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'no-store',
          },
          body: code,
        }
      } catch (error) {
        if (error.errors) {
          for (const e of error.errors) {
            if (e.location) {
              logger.log({
                level: 'ERROR',
                topic: 'UI',
                message: [
                  `Compile Error in: ${e.location.file}`,
                  await formatFrame(e),
                ].join('\n'),
              })
            } else {
              logger.log({
                level: 'ERROR',
                topic: 'UI',
                message: `Compile Error: ${e.text}`,
              })
            }
          }
        } else {
          logger.log({
            level: 'ERROR',
            topic: 'UI',
            message: 'Compile Error',
            error,
          })
        }

        return {status: 500}
      }
    },
    serveStatic(files),
    serveStatic(directory),
  )
}
