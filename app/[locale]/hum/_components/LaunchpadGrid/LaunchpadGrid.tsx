'use client'

import { useCallback } from 'react'
import { useLaunchpad } from '@/src/hooks/use-launchpad'
import { cn } from '@/src/utils/helpers'
import styles from './styles.module.css'

const ROWS = 8
const COLS = 8
const BASE_NOTE = 36

const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

function noteForCell(rowIdx: number, colIdx: number): number {
  return BASE_NOTE + (ROWS - 1 - rowIdx) * COLS + colIdx
}

function isBlackKey(midi: number): boolean {
  return BLACK_SEMITONES.has(midi % 12)
}

function isCNote(midi: number): boolean {
  return midi % 12 === 0
}

function noteLabel(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return names[midi % 12] + octave
}

type Props = {
  bpm: number
  isPlaying: boolean
  accentColor: string
  midiMuted: boolean
  onToggleMute: () => void
  onClear: () => void
}

export function LaunchpadGrid({ bpm, isPlaying, accentColor, midiMuted, onToggleMute, onClear }: Props) {
  const { activeNotes, recordedNotes, isRecording, toggleRecording, soundMode, toggleSoundMode, noteOn, noteOff } = useLaunchpad(bpm, isPlaying)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    noteOn(midi)
  }, [noteOn])

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLButtonElement>, midi: number) => {
    noteOff(midi)
  }, [noteOff])

  const handlePointerLeave = useCallback((midi: number, isActive: boolean) => {
    if (isActive) noteOff(midi)
  }, [noteOff])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>launchpad</span>
        <div className={styles.actions}>
          {recordedNotes.size > 0 && (
            <span className={styles.trackInfo}>{recordedNotes.size} notes</span>
          )}
          {recordedNotes.size > 0 && (
            <button className={styles.actionBtn} onClick={onClear}>clear</button>
          )}
          <button
            className={cn(styles.actionBtn, soundMode === 'piano' && styles.soundActive)}
            onClick={toggleSoundMode}
            aria-pressed={soundMode === 'piano'}
            aria-label={soundMode === 'piano' ? 'Switch to synth sound' : 'Switch to piano sound'}
          >
            {soundMode}
          </button>
          <button
            className={cn(styles.actionBtn, isRecording && styles.recActive)}
            onClick={toggleRecording}
            aria-pressed={isRecording}
            aria-label={isRecording ? 'Stop recording' : 'Record notes to loop'}
          >
            {isRecording ? 'rec ●' : 'rec'}
          </button>
          <button
            className={cn(styles.actionBtn, midiMuted && styles.mutedActive)}
            onClick={onToggleMute}
            aria-pressed={midiMuted}
            aria-label={midiMuted ? 'Unmute piano track' : 'Mute piano track'}
          >
            M
          </button>
        </div>
      </div>

      <div className={cn(styles.grid, isRecording && styles.gridRecording)}>
        {isRecording && <div className={styles.recOverlay} aria-hidden="true" />}
        {Array.from({ length: ROWS }, (_, rowIdx) => (
          <div key={rowIdx} className={styles.row}>
            {Array.from({ length: COLS }, (_, colIdx) => {
              const midi = noteForCell(rowIdx, colIdx)
              const isActive = activeNotes.has(midi)
              const isRecorded = recordedNotes.has(midi)
              const isBlack = isBlackKey(midi)
              const isC = isCNote(midi)
              return (
                <button
                  key={colIdx}
                  className={cn(
                    styles.pad,
                    isBlack && styles.black,
                    isC && styles.cNote,
                    isRecorded && !isActive && styles.recorded,
                    isActive && styles.active,
                  )}
                  onPointerDown={(e) => handlePointerDown(e, midi)}
                  onPointerUp={(e) => handlePointerUp(e, midi)}
                  onPointerLeave={() => handlePointerLeave(midi, isActive)}
                  aria-label={noteLabel(midi)}
                  aria-pressed={isActive}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
