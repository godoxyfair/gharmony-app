'use client'

import { useState } from 'react'
import { useStore } from '@/src/store/useStore'
import { buildMidi } from '@/lib/export/midi'
import { encodeWav, downloadBuffer } from '@/lib/export/wav'
import { buildChordSheet } from '@/lib/export/chord-sheet'
import { renderOffline } from '@/lib/audio/render-offline'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent } from '@/lib/music/harmonization'
import type { StyleName } from '@/lib/audio/playback'
import styles from './styles.module.css'

type Props = {
  notes: QuantizedNote[]
  chords: ChordEvent[]
  bpm: number
  style: StyleName
  isPlaying: boolean
  onStopPlayback: () => void
}

export function ExportPanel({ notes, chords, bpm, style, isPlaying, onStopPlayback }: Props) {
  const [rendering, setRendering] = useState(false)
  const stepGrid = useStore(s => s.stepGrid)
  const useCustomDrum = useStore(s => s.useCustomDrum)
  const midiTrack = useStore(s => s.midiTrack)
  const lyrics = useStore(s => s.lyrics)

  function handleMidi() {
    const buf = buildMidi(notes, chords, bpm)
    downloadBuffer(buf, 'worldsong.mid', 'audio/midi')
  }

  async function handleWav() {
    if (rendering) return
    if (isPlaying) onStopPlayback()
    setRendering(true)
    try {
      const customDrum = useCustomDrum
        ? stepGrid.map(row => row.map(cell => cell))
        : null
      const mt = midiTrack.length > 0 ? midiTrack : null
      const audioBuffer = await renderOffline(notes, chords, bpm, style, customDrum, mt)
      const wav = encodeWav(audioBuffer)
      downloadBuffer(wav, 'worldsong.wav', 'audio/wav')
    } finally {
      setRendering(false)
    }
  }

  function handleChordSheet() {
    const text = buildChordSheet(chords, lyrics)
    downloadBuffer(
      new TextEncoder().encode(text).buffer as ArrayBuffer,
      'worldsong-chords.txt',
      'text/plain',
    )
  }

  return (
    <div className={styles.wrap} role="group" aria-label="Export">
      <span className={styles.label}>export</span>
      <div className={styles.panel}>
        <button
          className={styles.btn}
          onClick={handleMidi}
          disabled={rendering}
          aria-label="Download MIDI file"
        >
          midi
        </button>
        <button
          className={styles.btn}
          onClick={handleWav}
          disabled={rendering}
          aria-label="Download WAV audio"
        >
          {rendering ? 'rendering…' : 'wav'}
        </button>
        <button
          className={styles.btn}
          onClick={handleChordSheet}
          disabled={rendering}
          aria-label="Download chord sheet"
        >
          chords
        </button>
      </div>
    </div>
  )
}
