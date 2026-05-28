'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { RecordButton } from '../RecordButton/RecordButton'
import { PianoRoll } from '../PianoRoll/PianoRoll'
import { KeyBadge } from '../KeyBadge/KeyBadge'
import { ChordStrip } from '../ChordStrip/ChordStrip'
import { StyleSelector } from '../StyleSelector/StyleSelector'
import { ProgressionLibrary } from '../ProgressionLibrary/ProgressionLibrary'
import { usePitchDetection } from '@/src/hooks/use-pitch-detection'
import { usePlayback } from '@/src/hooks/use-playback'
import { quantizeDetections } from '@/lib/music/notes'
import { detectKey, keyToAccentColor } from '@/lib/music/key-detection'
import { harmonize, quantizedToMelody } from '@/lib/music/harmonization'
import type { ChordEvent } from '@/lib/music/harmonization'
import type { RawDetection, QuantizedNote } from '@/lib/music/notes'
import { useStore } from '@/src/store/useStore'
import { cn } from '@/src/utils/helpers'
import styles from './styles.module.css'

const DEFAULT_BPM = 120

export function HumView() {
  const [isRecording, setIsRecording] = useState(false)
  const [detections, setDetections] = useState<RawDetection[]>([])
  const [quantized, setQuantized] = useState<QuantizedNote[] | null>(null)
  const detectionsRef = useRef<RawDetection[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  const { start: startDetection } = usePitchDetection()
  const { play, stop: stopPlayback, isPlaying, style, setStyle, activeBeat, queueChordsUpdate } = usePlayback()

  const accentColor = useStore(s => s.accentColor)
  const setAccentColor = useStore(s => s.setAccentColor)
  const detectedKey = useStore(s => s.detectedKey)
  const setDetectedKey = useStore(s => s.setDetectedKey)
  const chords = useStore(s => s.chords)
  const setChords = useStore(s => s.setChords)

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor)
  }, [accentColor])

  const handleRecordStart = useCallback(async (stream: MediaStream, ctx: AudioContext) => {
    stopPlayback()
    ctxRef.current = ctx
    detectionsRef.current = []
    setDetections([])
    setQuantized(null)
    setDetectedKey(null)
    setChords(null)
    setIsRecording(true)

    const t0 = ctx.currentTime

    const cleanup = await startDetection(ctx, stream, (d: RawDetection) => {
      const normalized: RawDetection = { ...d, time: d.time - t0 }
      detectionsRef.current = [...detectionsRef.current, normalized]
      setDetections(prev => [...prev, normalized])
    })

    cleanupRef.current = cleanup ?? null
  }, [startDetection, stopPlayback, setDetectedKey, setChords])

  const handleRecordStop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setIsRecording(false)

    const notes = quantizeDetections(detectionsRef.current, DEFAULT_BPM)
    setQuantized(notes)

    const result = detectKey(notes)
    if (result) {
      setDetectedKey(result)
      setAccentColor(keyToAccentColor(result.key, result.mode))
      const melody = quantizedToMelody(notes, DEFAULT_BPM)
      setChords(harmonize(melody, result.key, result.mode))
    }
  }, [setDetectedKey, setAccentColor, setChords])

  const handleChordsChange = useCallback((newChords: ChordEvent[]) => {
    setChords(newChords)
    queueChordsUpdate(newChords)
  }, [setChords, queueChordsUpdate])

  const handleKeyOverride = useCallback((key: number, mode: 'major' | 'minor') => {
    const result = { key, mode, confidence: 1 }
    setDetectedKey(result)
    setAccentColor(keyToAccentColor(key, mode))
  }, [setDetectedKey, setAccentColor])

  const handleProgressionLoad = useCallback((newChords: ChordEvent[]) => {
    setChords(newChords)
    queueChordsUpdate(newChords)
  }, [setChords, queueChordsUpdate])

  const handlePlay = useCallback(() => {
    if (!chords) return
    if (isPlaying) {
      stopPlayback()
    } else {
      play(quantized ?? [], chords, DEFAULT_BPM)
    }
  }, [quantized, chords, isPlaying, play, stopPlayback])

  return (
    <div className={styles.wrap}>
      <RecordButton
        onRecordStart={handleRecordStart}
        onRecordStop={handleRecordStop}
      />
      {detectedKey !== null && (
        <KeyBadge result={detectedKey} onOverride={handleKeyOverride} />
      )}
      {chords !== null && chords.length > 0 && !isRecording && (
        <ChordStrip
          chords={chords}
          keyResult={detectedKey}
          activeBeat={activeBeat}
          onChordsChange={handleChordsChange}
        />
      )}
      <ProgressionLibrary
        keyResult={detectedKey}
        onLoad={handleProgressionLoad}
      />
      <PianoRoll
        detections={detections}
        quantized={quantized}
        isRecording={isRecording}
        bpm={DEFAULT_BPM}
        accentColor={accentColor}
      />
      {chords !== null && chords.length > 0 && !isRecording && (
        <div className={styles.controls}>
          <StyleSelector value={style} onChange={setStyle} />
          <button
            className={cn(styles.playBtn, isPlaying && styles.active)}
            onClick={handlePlay}
            aria-label={isPlaying ? 'Stop playback' : 'Play melody'}
          >
            {isPlaying ? <StopIcon /> : <PlayIcon />}
          </button>
        </div>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  )
}
