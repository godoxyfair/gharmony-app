import { getTranslations } from 'next-intl/server'
import { LandingView } from './_components/LandingView/LandingView'

export default async function HomePage() {
  const t = await getTranslations('landing')
  return <LandingView tagline={t('tagline')} cta={t('cta')} />
}
