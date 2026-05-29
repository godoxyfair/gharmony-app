import { useState, useRef, useCallback } from 'react'
import styles from './styles.module.css'

type Props = {
  bpm: number
  onTap: () => void
  onSet: (bpm: number) => void
}

export function TapTempo({ bpm, onTap, onSet }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = useCallback(() => {
    const val = parseInt(draft, 10)
    if (!isNaN(val) && val >= 40 && val <= 240) {
      onSet(val)
    }
    setEditing(false)
    setDraft('')
  }, [draft, onSet])

  const handleFocus = () => {
    setEditing(true)
    setDraft(String(bpm))
  }

  const handleBlur = () => commit()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setDraft('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        type="number"
        className={styles.bpmInput}
        value={editing ? draft : bpm}
        min={40}
        max={240}
        aria-label="BPM"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className={styles.bpmLabel}>bpm</span>
      <button
        type="button"
        className={styles.tapBtn}
        onClick={onTap}
        aria-label="Tap tempo"
      >
        tap
      </button>
    </div>
  )
}
