import { useRouter as useNextRouter } from 'next/router'
import { useMemo } from 'react'

export const useRouter: typeof useNextRouter = () => {
  const router = useNextRouter()

  return useMemo(
    () => ({
      ...router,
      locale: router.route.split('/')[1],
      defaultLocale: process.env.NEXTRA_DEFAULT_LOCALE
    }),
    [router]
  )
}
