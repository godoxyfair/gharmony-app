'use client'
import dynamic from 'next/dynamic'
import { Link } from '@/src/i18n/navigation'
import styles from './styles.module.css'

const WorldCubeCanvas = dynamic(
  () => import('./WorldCubeCanvas').then(m => ({ default: m.WorldCubeCanvas })),
  { ssr: false }
)

export function WorldCube() {
  return (
    <Link href="/world" className={styles.wrap} aria-label="Open world scene">
      <WorldCubeCanvas />
      <span className={styles.hint}>world</span>
    </Link>
  )
}
