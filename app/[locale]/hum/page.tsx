import { HumView } from './_components/HumView/HumView'
import styles from './styles.module.css'

export default function HumPage() {
  return (
    <main className={styles.page}>
      <HumView />
      <p className={styles.hint}>hum to begin</p>
    </main>
  )
}
