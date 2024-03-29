import process from 'node:process'
import path from 'node:path'
import {compose, Logger} from 'passing-notes'
import serveUi from '../index.js'

export const logger = new Logger()

export default compose(
  serveUi({path: path.resolve(process.env.UI_PATH), logger}),
  () => () => ({status: 404}),
)
