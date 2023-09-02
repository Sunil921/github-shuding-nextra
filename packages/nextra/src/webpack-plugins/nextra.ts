import { join } from 'node:path'
import { promises as fs } from 'graceful-fs'
import type { Compiler } from 'webpack'
import { CWD } from '../constants'
import { PAGES_DIR } from '../file-system'
import { pageMapCache } from '../page-map'
import { collectFiles } from '../plugin'
import type { Folder } from '../types'

export class NextraPlugin {
  constructor(private config: { locales: string[] }) {}

  apply(compiler: Compiler) {
    const pluginName = this.constructor.name
    compiler.hooks.beforeCompile.tapAsync(pluginName, async (_, callback) => {
      const { locales } = this.config
      try {
        const result = await collectFiles({ dir: PAGES_DIR, locales })
        pageMapCache.set(result)

        for (const locale of locales) {
          const folderItem = result.items.find(
            (item): item is Folder => 'name' in item && item.name === locale
          )
          if (!folderItem) continue

          const pageMapPath = join(
            CWD,
            '.next',
            'static',
            'chunks',
            `nextra-page-map-${locale}.json`
          )

          await fs.writeFile(
            pageMapPath,
            JSON.stringify(folderItem.children, null, 2),
            'utf8'
          )
        }

        callback()
      } catch (error) {
        callback(error as Error)
      }
    })
  }
}
