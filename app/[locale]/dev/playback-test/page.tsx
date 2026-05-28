'use client'

import { useState, useCallback } from 'react'
import { playA, stopA } from '@/lib/audio/playback-a'
import { playB, stopB } from '@/lib/audio/playback-b'
import type { StyleName } from '@/lib/audio/playback-a'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent } from '@/lib/music/harmonization'

// C major melody, BPM 120 — 2 bars, 8th notes
// Melody: E4-G4-A4-G4 | F4-E4-D4-C4(long)
const TEST_NOTES: QuantizedNote[] = [
  { midi: 64, startTime: 0,    duration: 0.25, clarity: 0.92 }, // E4
  { midi: 67, startTime: 0.25, duration: 0.25, clarity: 0.90 }, // G4
  { midi: 69, startTime: 0.5,  duration: 0.25, clarity: 0.91 }, // A4
  { midi: 67, startTime: 0.75, duration: 0.25, clarity: 0.89 }, // G4
  { midi: 65, startTime: 1.0,  duration: 0.25, clarity: 0.91 }, // F4
  { midi: 64, startTime: 1.25, duration: 0.25, clarity: 0.90 }, // E4
  { midi: 62, startTime: 1.5,  duration: 0.25, clarity: 0.88 }, // D4
  { midi: 60, startTime: 1.75, duration: 0.5,  clarity: 0.93 }, // C4
]

// I-IV in C major, 4 beats each (2 bars total)
const TEST_CHORDS: ChordEvent[] = [
  { chord: { root: 0, quality: 'maj', inversion: 0 }, beat: 0, duration: 4 }, // C
  { chord: { root: 5, quality: 'maj', inversion: 0 }, beat: 4, duration: 4 }, // F
]

const TEST_BPM = 120

const STYLES: StyleName[] = ['folk', 'cinematic', 'lofi']

export default function PlaybackTestPage() {
  const [variant, setVariant] = useState<'A' | 'B'>('A')
  const [style, setStyle] = useState<StyleName>('folk')
  const [playing, setPlaying] = useState(false)

  const handlePlay = useCallback(async () => {
    if (playing) {
      stopA()
      stopB()
      setPlaying(false)
      return
    }
    setPlaying(true)
    if (variant === 'A') {
      await playA(TEST_NOTES, TEST_CHORDS, TEST_BPM, style)
    } else {
      await playB(TEST_NOTES, TEST_CHORDS, TEST_BPM, style)
    }
  }, [playing, variant, style])

  const switchVariant = useCallback((v: 'A' | 'B') => {
    stopA()
    stopB()
    setPlaying(false)
    setVariant(v)
  }, [])

  const switchStyle = useCallback((s: StyleName) => {
    stopA()
    stopB()
    setPlaying(false)
    setStyle(s)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0e0d0c', color: '#f5f1ea', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b6660' }}>
        Playback engine A/B test
      </h1>

      {/* Variant selector */}
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6660', marginBottom: 10 }}>Melody engine</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['A', 'B'] as const).map(v => (
            <button
              key={v}
              onClick={() => switchVariant(v)}
              style={{
                padding: '8px 24px',
                border: `1px solid ${variant === v ? '#f5f1ea' : '#333'}`,
                background: variant === v ? '#f5f1ea' : 'transparent',
                color: variant === v ? '#0e0d0c' : '#6b6660',
                cursor: 'pointer',
                fontSize: 13,
                letterSpacing: '0.08em',
              }}
            >
              {v === 'A' ? 'A — Tone.js PolySynth' : 'B — PeriodicWave piano'}
            </button>
          ))}
        </div>
      </div>

      {/* Style selector */}
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6660', marginBottom: 10 }}>Style</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {STYLES.map(s => (
            <button
              key={s}
              onClick={() => switchStyle(s)}
              style={{
                padding: '8px 20px',
                border: `1px solid ${style === s ? '#c4a35a' : '#333'}`,
                background: 'transparent',
                color: style === s ? '#c4a35a' : '#6b6660',
                cursor: 'pointer',
                fontSize: 12,
                letterSpacing: '0.08em',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Play / Stop */}
      <button
        onClick={handlePlay}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: `1px solid ${playing ? '#888' : '#f5f1ea'}`,
          background: 'transparent',
          color: '#f5f1ea',
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={playing ? 'Stop' : 'Play'}
      >
        {playing ? '■' : '▶'}
      </button>

      <p style={{ fontSize: 11, color: '#444', letterSpacing: '0.08em' }}>
        {variant} / {style} {playing ? '· playing' : '· stopped'}
      </p>

      <div style={{ fontSize: 11, color: '#333', textAlign: 'center', lineHeight: 1.8 }}>
        <p>Melody: E4 G4 A4 G4 | F4 E4 D4 C4</p>
        <p>Chords: C maj → F maj  ·  BPM 120  ·  loops</p>
      </div>
    </div>
  )
}
