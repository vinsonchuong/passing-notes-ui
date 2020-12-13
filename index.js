import path from 'path'
import serveStatic from 'passing-notes-static'
import flowRight from 'lodash/flowRight.js'
import {compileFile, compilePackages, formatFrame} from './lib/index.js'

const packageDirectory = './node_modules/.cache/passing-notes-ui/packages'

export default function ({path: directory, logger}) {
  return flowRight(
    serveStatic(packageDirectory, '/npm'),
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
          message: 'Compiling UI'
        })
        const {code, dependencies} = await compileFile(filePath)
        finishCompileFile({message: 'Finished'})

        await compilePackages(dependencies, logger)

        return {
          status: 200,
          headers: {
            'content-length': `${code.length}`,
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'no-store'
          },
          body: code
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
                  await formatFrame(e)
                ].join('\n')
              })
            } else {
              logger.log({
                level: 'ERROR',
                topic: 'UI',
                message: `Compile Error: ${e.text}`
              })
            }
          }
        } else {
          logger.log({
            level: 'ERROR',
            topic: 'UI',
            message: 'Compile Error',
            error
          })
        }

        return {status: 500}
      }
    },
    serveStatic(directory)
  )
}
