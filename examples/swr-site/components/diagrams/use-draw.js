import { useLocale } from '../use-locale'

export function useDraw(paths = {}, name = '') {
  const { locale, defaultLocale } = useLocale()

  if (!Object.hasOwn(paths, defaultLocale)) {
    throw new Error(
      `Please provide '${defaultLocale}' locale inside '${paths}'.`
    )
  }

  if (
    typeof paths[locale] === 'string' &&
    typeof paths[defaultLocale] === 'string'
  ) {
    return paths[locale] || paths[defaultLocale]
  }

  return paths[locale]?.[name] || paths[defaultLocale][name]
}
