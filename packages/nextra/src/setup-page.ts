/*
 * ⚠️ Attention!
 * This file should be never used directly, only in loader.ts
 */

import get from 'lodash.get'
import type { FC } from 'react'
import { NEXTRA_INTERNAL } from './constants'
import NextraLayout from './layout'
import type {
  DynamicFolder,
  DynamicMeta,
  DynamicMetaDescriptor,
  DynamicMetaItem,
  DynamicMetaJsonFile,
  Folder,
  NextraInternalGlobal,
  PageMapItem,
  PageOpts
} from './types'
import { normalizePageRoute, pageTitleFromFilename } from './utils'

function isFolder(value: DynamicMetaItem): value is DynamicFolder {
  return !!value && typeof value === 'object' && value.type === 'folder'
}

function normalizeMetaData(obj: DynamicMeta): DynamicMeta {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (isFolder(value)) {
        const keyWithoutSlash = key.replace('/', '')
        return [
          keyWithoutSlash,
          value.title || pageTitleFromFilename(keyWithoutSlash)
        ]
      }
      return [key, value || pageTitleFromFilename(key)]
    })
  )
}

export function collectCatchAllRoutes(
  parent: Folder<any>,
  meta: DynamicMetaJsonFile,
  isRootFolder = true
): void {
  if (isRootFolder) {
    collectCatchAllRoutes(
      parent,
      {
        kind: 'Meta',
        data: meta.data,
        locale: meta.locale
      },
      false
    )
    meta.data = normalizeMetaData(meta.data)
    return
  }
  for (const [key, value] of Object.entries(meta.data)) {
    if (!isFolder(value)) {
      if (key === '*') {
        continue
      }
      parent.children.push({
        kind: 'MdxPage',
        ...(meta.locale && { locale: meta.locale }),
        name: key,
        route: normalizePageRoute(parent.route, key)
      })
      continue
    }
    const routeWithoutSlashes = key.replace('/', '')
    const newParent: Folder = {
      kind: 'Folder',
      name: routeWithoutSlashes,
      route: `${parent.route}/${routeWithoutSlashes}`,
      children: [
        {
          kind: 'Meta',
          ...(meta.locale && { locale: meta.locale }),
          data: normalizeMetaData(value.items)
        }
      ]
    }

    parent.children.push(newParent)
    collectCatchAllRoutes(
      newParent,
      {
        kind: 'Meta',
        data: value.items,
        locale: meta.locale
      },
      false
    )
  }
}

let cachedResolvedPageMap: PageMapItem[]

export function setupNextraPage({
  pageOpts,
  MDXContent,
  hot,
  pageOptsChecksum,
  dynamicMetaModules = [],
  route,
}: {
  pageOpts: PageOpts
  MDXContent: FC
  hot?: __WebpackModuleApi.Hot
  pageOptsChecksum?: string
  dynamicMetaModules?: [Promise<any>, DynamicMetaDescriptor][],
  route: string
}) {
  if (typeof window === 'undefined') {
    globalThis.__nextra_resolvePageMap = async () => {
      if (process.env.NODE_ENV === 'production' && cachedResolvedPageMap) {
        return cachedResolvedPageMap
      }
      const clonedPageMap: PageMapItem[] = JSON.parse(
        JSON.stringify(__nextra_internal__.pageMap)
      )

      await Promise.all(
        dynamicMetaModules.map(
          async ([importMod, { metaObjectKeyPath, metaParentKeyPath }]) => {
            const mod = await importMod
            const metaData = await mod.default()
            const meta: DynamicMetaJsonFile = get(
              clonedPageMap,
              metaObjectKeyPath
            )
            meta.data = metaData

            const parent: Folder = get(clonedPageMap, metaParentKeyPath)
            collectCatchAllRoutes(parent, meta)
          }
        )
      )
      return (cachedResolvedPageMap = clonedPageMap)
    }
  }

  // Make sure the same component is always returned so Next.js will render the
  // stable layout. We then put the actual content into a global store and use
  // the route to identify it.
  const __nextra_internal__ = ((globalThis as NextraInternalGlobal)[
    NEXTRA_INTERNAL
  ] ||= Object.create(null))
  // while using `_app.md/mdx` pageMap will be injected in _app file to boost compilation time,
  // and reduce bundle size
  pageOpts = {
    // @ts-ignore ignore "'frontMatter' is specified more than once" error to treeshake empty object `{}` for each compiled page
    frontMatter: {},
    ...pageOpts,
    flexsearch: __nextra_internal__.flexsearch
  }

  __nextra_internal__.route = route
  __nextra_internal__.context ||= Object.create(null)
  __nextra_internal__.context[route] = {
    Content: MDXContent,
    pageOpts,
    themeConfig: __nextra_internal__.themeConfig
  }

  if (process.env.NODE_ENV !== 'production' && hot) {
    __nextra_internal__.refreshListeners ||= Object.create(null)
    const checksum = pageOptsChecksum
    hot.data ||= Object.create(null)
    if (hot.data.prevPageOptsChecksum !== checksum) {
      const listeners =
        __nextra_internal__.refreshListeners[route] || []
      for (const listener of listeners) {
        listener()
      }
    }
    hot.dispose(data => {
      data.prevPageOptsChecksum = checksum
    })
  }
  return NextraLayout
}
