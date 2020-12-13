import enhancedResolve from 'enhanced-resolve'
import {promisify} from 'util'

const resolve = promisify(
  enhancedResolve.create({
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser']
  })
)

export default async function (fromDirectory, modulePath) {
  try {
    return await resolve(fromDirectory, modulePath)
  } catch (error) {
    if (error.message.startsWith("Can't resolve")) {
      return null
    }

    throw error
  }
}
