import type { StyleName } from '@/lib/audio/playback'
import styles from './styles.module.css'

type Props = {
  value: StyleName
  onChange: (s: StyleName) => void
}

const OPTIONS: StyleName[] = ['folk', 'cinematic', 'lofi', 'rock', 'dreampop', 'indie']

export function StyleSelector({ value, onChange }: Props) {
  return (
    <div className={styles.row}>
      {OPTIONS.map(s => (
        <button
          key={s}
          className={`${styles.btn} ${value === s ? styles.active : ''}`}
          onClick={() => onChange(s)}
          aria-pressed={value === s}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
