import { useRouter } from 'next/router'

export function useLocale() {
  const { route } = useRouter()
  return {
    locale: route.split('/')[1],
    defaultLocale: process.env.NEXTRA_DEFAULT_LOCALE
  }
}
