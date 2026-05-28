'use client'

import { useCallback, useRef, useState } from 'react'
import { getTransport } from 'tone'
import { play as playEngine, stop as stopEngine } from '@/lib/audio/playback'
import type { StyleName } from '@/lib/audio/playback'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent } from '@/lib/music/harmonization'

type PlayArgs = { notes: QuantizedNote[]; chords: ChordEvent[]; bpm: number }

export function usePlayback() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeBeat, setActiveBeat] = useState(-1)
  const [style, setStyleState] = useState<StyleName>('folk')
  const styleRef = useRef<StyleName>('folk')
  const argsRef = useRef<PlayArgs | null>(null)
  const playingRef = useRef(false)
  const pendingChordsRef = useRef<ChordEvent[] | null>(null)
  const loopLengthRef = useRef(0)
  const lastSecsRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    if (!playingRef.current) return

    const secs = getTransport().seconds

    if (
      loopLengthRef.current > 0 &&
      lastSecsRef.current > loopLengthRef.current * 0.8 &&
      secs < 0.3
    ) {
      if (pendingChordsRef.current !== null && argsRef.current !== null) {
        const pending = pendingChordsRef.current
        pendingChordsRef.current = null
        argsRef.current = { ...argsRef.current, chords: pending }
        const { notes, chords, bpm } = argsRef.current
        lastSecsRef.current = 0
        playEngine(notes, chords, bpm, styleRef.current).then(() => {
          if (playingRef.current) rafRef.current = requestAnimationFrame(tick)
        })
        return
      }
    }

    lastSecsRef.current = secs

    if (argsRef.current) {
      const { chords, bpm } = argsRef.current
      const currentBeat = secs * bpm / 60
      let ab = -1
      for (let i = chords.length - 1; i >= 0; i--) {
        if (chords[i].beat <= currentBeat) { ab = chords[i].beat; break }
      }
      setActiveBeat(ab)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const play = useCallback(async (notes: QuantizedNote[], chords: ChordEvent[], bpm: number) => {
    const bd = 60 / bpm
    const lastSec = notes.length > 0
      ? Math.max(...notes.map(n => n.startTime + n.duration))
      : 4 * bd
    const loopBars = Math.max(2, Math.ceil(lastSec / (4 * bd)))
    loopLengthRef.current = loopBars * 4 * bd
    lastSecsRef.current = 0
    pendingChordsRef.current = null
    argsRef.current = { notes, chords, bpm }
    playingRef.current = true
    setIsPlaying(true)
    await playEngine(notes, chords, bpm, styleRef.current)
    stopRaf()
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, stopRaf])

  const stop = useCallback(() => {
    stopEngine()
    playingRef.current = false
    setIsPlaying(false)
    setActiveBeat(-1)
    stopRaf()
  }, [stopRaf])

  const setStyle = useCallback(async (s: StyleName) => {
    styleRef.current = s
    setStyleState(s)
    if (playingRef.current && argsRef.current) {
      const { notes, chords, bpm } = argsRef.current
      await playEngine(notes, chords, bpm, s)
    }
  }, [])

  const queueChordsUpdate = useCallback((newChords: ChordEvent[]) => {
    pendingChordsRef.current = newChords
  }, [])

  return { play, stop, isPlaying, style, setStyle, activeBeat, queueChordsUpdate }
}
