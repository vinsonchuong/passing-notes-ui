import {promisify} from 'node:util'
import enhancedResolve from 'enhanced-resolve'

const resolve = promisify(
  enhancedResolve.create({
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'import'],
  }),
)

export default async function resolveModulePath(fromDirectory, modulePath) {
  try {
    return await resolve(fromDirectory, modulePath)
  } catch (error) {
    if (error.message.startsWith("Can't resolve")) {
      return null
    }

    throw error
  }
}
