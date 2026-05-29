'use client'
import dynamic from 'next/dynamic'

const WorldPageClient = dynamic(
  () => import('./WorldPageClient').then(m => ({ default: m.WorldPageClient })),
  { ssr: false }
)

export function WorldPageWrapper() {
  return <WorldPageClient />
}
