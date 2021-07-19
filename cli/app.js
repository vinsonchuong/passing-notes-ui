import path from 'node:path'
import {compose, Logger} from 'passing-notes'
import serveUi from '../index.js'

const logger = new Logger()

export default compose(
  serveUi({path: path.resolve(process.env.UI_PATH), logger}),
  () => () => ({status: 404})
)
