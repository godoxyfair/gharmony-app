'use client'

import styles from './styles.module.css'
import { cn } from '@/src/utils/helpers'

type Props = {
  label: string
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (value: number) => void
  className?: string
}

export function Slider({ label, min = 0, max = 100, step = 1, value, onChange, className }: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={cn(styles.wrapper, className)}>
      <label className={styles.label}>{label}</label>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className={styles.input}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />
      </div>
      <span className={styles.value} aria-hidden>{value}</span>
    </div>
  )
}
