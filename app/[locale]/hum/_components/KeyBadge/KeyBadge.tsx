'use client'

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { motion } from 'framer-motion'
import type { KeyResult } from '@/lib/music/key-detection'
import { keyToName } from '@/lib/music/key-detection'
import styles from './styles.module.css'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_OPTIONS = NOTE_NAMES.map((_, i) => ({ key: i, mode: 'major' as const, confidence: 1 }))
const MINOR_OPTIONS = NOTE_NAMES.map((_, i) => ({ key: i, mode: 'minor' as const, confidence: 1 }))

type Props = {
  result: KeyResult
  onOverride: (key: number, mode: 'major' | 'minor') => void
}

export function KeyBadge({ result, onOverride }: Props) {
  const confidence = Math.round(result.confidence * 100)

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Listbox
        value={result}
        onChange={(v) => onOverride(v.key, v.mode)}
        by={(a, b) => a?.key === b?.key && a?.mode === b?.mode}
      >
        <ListboxButton className={styles.trigger}>
          <span className={styles.name}>{keyToName(result.key, result.mode)}</span>
          <span className={styles.dot} aria-hidden="true">·</span>
          <span className={styles.confidence}>{confidence}%</span>
          <ChevronIcon />
        </ListboxButton>

        <ListboxOptions className={styles.dropdown} anchor="bottom start">
          <div className={styles.group}>
            <span className={styles.groupLabel}>Major</span>
            {MAJOR_OPTIONS.map((opt) => (
              <ListboxOption
                key={`${opt.key}-major`}
                value={opt}
                className={({ focus, selected }) =>
                  [styles.option, focus ? styles.focused : '', selected ? styles.selected : ''].join(' ')
                }
              >
                {keyToName(opt.key, 'major')}
              </ListboxOption>
            ))}
          </div>
          <div className={styles.groupSep} />
          <div className={styles.group}>
            <span className={styles.groupLabel}>Minor</span>
            {MINOR_OPTIONS.map((opt) => (
              <ListboxOption
                key={`${opt.key}-minor`}
                value={opt}
                className={({ focus, selected }) =>
                  [styles.option, focus ? styles.focused : '', selected ? styles.selected : ''].join(' ')
                }
              >
                {keyToName(opt.key, 'minor')}
              </ListboxOption>
            ))}
          </div>
        </ListboxOptions>
      </Listbox>
    </motion.div>
  )
}

function ChevronIcon() {
  return (
    <svg className={styles.chevron} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
