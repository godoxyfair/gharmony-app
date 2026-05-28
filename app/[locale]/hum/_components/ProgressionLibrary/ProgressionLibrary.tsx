'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PROGRESSIONS, applyProgression } from '@/lib/music/progressions'
import type { ChordEvent } from '@/lib/music/harmonization'
import type { KeyResult } from '@/lib/music/key-detection'
import styles from './styles.module.css'

type Props = {
  keyResult: KeyResult | null
  onLoad: (chords: ChordEvent[]) => void
}

export function ProgressionLibrary({ keyResult, onLoad }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const key = keyResult?.key ?? 0

  function handleLoad(idx: number) {
    onLoad(applyProgression(PROGRESSIONS[idx], key))
    setOpen(false)
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    const len = PROGRESSIONS.length
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (activeIdx + 1) % len
      setActiveIdx(next)
      cardRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (activeIdx - 1 + len) % len
      setActiveIdx(prev)
      cardRefs.current[prev]?.focus()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="progression-library"
      >
        progressions
        <span className={styles.arrow} aria-hidden="true">{open ? '↑' : '↓'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="progression-library"
            className={styles.panel}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleGridKeyDown}
          >
            {PROGRESSIONS.map((p, i) => (
              <button
                key={p.name}
                ref={el => { cardRefs.current[i] = el }}
                className={styles.card}
                tabIndex={i === activeIdx ? 0 : -1}
                onClick={() => handleLoad(i)}
                onFocus={() => setActiveIdx(i)}
                aria-label={`${p.name}: ${p.label}`}
              >
                <span className={styles.cardName}>{p.name}</span>
                <span className={styles.cardMode}>{p.mode}</span>
                <span className={styles.cardLabel}>{p.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
