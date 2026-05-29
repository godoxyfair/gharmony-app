'use client'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/src/store/useStore'
import styles from './styles.module.css'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function NarrativeDisplay() {
  const [displayed, setDisplayed] = useState('')
  const targetRef = useRef('')
  const indexRef = useRef(0)
  const doneRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    const state = useStore.getState()

    timerRef.current = setInterval(() => {
      const target = targetRef.current
      if (indexRef.current < target.length) {
        indexRef.current++
        setDisplayed(target.slice(0, indexRef.current))
      } else if (doneRef.current && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 28)

    async function fetchNarrative() {
      let tempo = 120
      try {
        const { getTransport } = await import('tone')
        tempo = Math.round(getTransport().bpm.value)
      } catch {}

      const { detectedKey, midiTrack, stepGrid, humBuffer } = state

      const key = detectedKey ? NOTE_NAMES[detectedKey.key] : 'C'
      const mode = detectedKey?.mode ?? 'major'

      const noteCount = midiTrack.length
      const dynamics: 'quiet' | 'medium' | 'loud' =
        noteCount === 0 ? 'quiet' : noteCount > 16 ? 'loud' : 'medium'

      const hasDrum = stepGrid.some(row => row.some(Boolean))
      const hasHum = humBuffer !== null
      const activeLayers = [midiTrack.length > 0, hasDrum, hasHum].filter(Boolean).length
      const texture: 'sparse' | 'layered' | 'dense' =
        activeLayers <= 1 ? 'sparse' : activeLayers >= 3 ? 'dense' : 'layered'

      const parts: string[] = []
      if (midiTrack.length > 0) parts.push('synthesizer')
      if (hasDrum) parts.push('percussion')
      if (hasHum) parts.push('voice')
      const instruments = parts.join(', ') || 'synthesizer'

      try {
        const res = await fetch('/api/narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, mode, tempo, dynamics, texture, instruments }),
        })

        if (!res.ok || !res.body || cancelled) {
          doneRef.current = true
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (cancelled) { reader.cancel(); break }
          targetRef.current += decoder.decode(value, { stream: true })
        }
      } catch {}

      doneRef.current = true
    }

    fetchNarrative()

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!displayed) return null

  return (
    <div className={styles.wrap}>
      <p className={styles.text}>{displayed}</p>
    </div>
  )
}
