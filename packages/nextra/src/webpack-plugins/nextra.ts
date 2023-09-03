import { join } from 'node:path'
import { promises as fs } from 'graceful-fs'
import type { Compiler } from 'webpack'
import { CWD } from '../constants'
import { PAGES_DIR } from '../file-system'
import { collectFiles } from '../plugin'
import type { Folder } from '../types'

export class NextraPlugin {
  constructor(private config: { locales: string[] }) {}

  apply(compiler: Compiler) {
    const pluginName = this.constructor.name
    const { locales } = this.config
    const chunksPath = join(CWD, '.next', 'static', 'chunks')

    compiler.hooks.beforeCompile.tapAsync(pluginName, async (_, callback) => {
      try {
        const result = await collectFiles({ dir: PAGES_DIR, locales })

        for (const locale of locales) {
          const folderItem =
            locale === ''
              ? { children: result.items }
              : result.items.find(
                  (item): item is Folder =>
                    'name' in item && item.name === locale
                )

          if (!folderItem) continue

          await fs.mkdir(join(chunksPath), { recursive: true })

          await fs.writeFile(
            join(chunksPath, `nextra-page-map-${locale}.json`),
            JSON.stringify(folderItem.children, null, 2),
            'utf8'
          )
        }

        await fs.writeFile(
          join(chunksPath, 'nextra-file-map.mjs'),
          `export const fileMap = ${JSON.stringify(result.fileMap, null, 2)}`,
          'utf8'
        )
        callback()
      } catch (error) {
        callback(error as Error)
      }
    })
  }
}
