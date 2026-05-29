import { HumView } from './_components/HumView/HumView'
import { WorldCube } from './_components/WorldCube/WorldCube'
import styles from './styles.module.css'

export default function HumPage() {
  return (
    <main className={styles.page}>
      <WorldCube />
      <HumView />
      <p className={styles.hint}>hum to begin</p>
    </main>
  )
}
