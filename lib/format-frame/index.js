import {promises as fs} from 'node:fs'
import {codeFrameColumns} from '@babel/code-frame'

export default async function ({location, text}) {
  return codeFrameColumns(
    await fs.readFile(location.file, 'utf8'),
    {
      start: {line: location.line, column: location.column + 1},
      end: {line: location.line, column: location.column + 1 + location.length},
    },
    {
      highlightCode: true,
      forceColor: true,
      message: text,
    },
  )
}
