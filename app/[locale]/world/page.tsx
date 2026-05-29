import type { Metadata } from 'next'
import { WorldPageWrapper } from './WorldPageWrapper'
import styles from './styles.module.css'

export const metadata: Metadata = {
  title: 'World — Worldsong',
}

export default function WorldPage() {
  return (
    <main className={styles.page}>
      <WorldPageWrapper />
    </main>
  )
}
