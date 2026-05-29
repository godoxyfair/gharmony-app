import { useCallback, useRef, useState } from 'react'

const MIN_BPM = 40
const MAX_BPM = 240
const RESET_MS = 3000
const WINDOW = 4

export function useTapTempo(initialBpm: number = 120) {
  const [bpm, setBpm] = useState(initialBpm)
  const tapsRef = useRef<number[]>([])

  const tap = useCallback(() => {
    const now = performance.now()
    const prev = tapsRef.current

    if (prev.length > 0 && now - prev[prev.length - 1] > RESET_MS) {
      tapsRef.current = [now]
      return
    }

    const next = [...prev, now].slice(-(WINDOW + 1))
    tapsRef.current = next

    if (next.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < next.length; i++) {
        intervals.push(next[i] - next[i - 1])
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(60000 / avgMs)))
      setBpm(clamped)
    }
  }, [])

  const set = useCallback((val: number) => {
    tapsRef.current = []
    setBpm(Math.max(MIN_BPM, Math.min(MAX_BPM, val)))
  }, [])

  return { bpm, tap, set }
}
