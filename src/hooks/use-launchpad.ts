'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ensureLivePiano, livePianoNoteOn, livePianoNoteOff } from '@/lib/audio/playback'
import { useStore } from '@/src/store/useStore'

export function useLaunchpad(bpm: number, isPlaying: boolean) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [isRecording, setIsRecording] = useState(false)
  const [soundMode, setSoundMode] = useState<'synth' | 'piano'>('synth')
  const noteStartBeats = useRef<Record<number, number>>({})
  const noteStartRealMs = useRef<Record<number, number>>({})
  const playStartMsRef = useRef<number | null>(null)

  const setMidiTrack = useStore(s => s.setMidiTrack)
  const midiTrack = useStore(s => s.midiTrack)

  useEffect(() => {
    if (isPlaying) {
      playStartMsRef.current = performance.now()
    } else {
      playStartMsRef.current = null
    }
  }, [isPlaying])

  const recordedNotes = useMemo(
    () => new Set(midiTrack.map(n => n.note)),
    [midiTrack],
  )

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev)
  }, [])

  const toggleSoundMode = useCallback(() => {
    setSoundMode(prev => prev === 'synth' ? 'piano' : 'synth')
  }, [])

  const noteOn = useCallback(async (midi: number) => {
    const capturedBeat = (isRecording && isPlaying && playStartMsRef.current !== null)
      ? (performance.now() - playStartMsRef.current) * bpm / 60000
      : null

    await ensureLivePiano(soundMode)
    livePianoNoteOn(midi)
    setActiveNotes(prev => { const n = new Set(prev); n.add(midi); return n })

    if (capturedBeat !== null) {
      noteStartBeats.current[midi] = capturedBeat
      noteStartRealMs.current[midi] = performance.now()
    }
  }, [soundMode, isRecording, isPlaying, bpm])

  const noteOff = useCallback((midi: number) => {
    livePianoNoteOff(midi)
    setActiveNotes(prev => { const n = new Set(prev); n.delete(midi); return n })

    if (isRecording && isPlaying && noteStartBeats.current[midi] !== undefined) {
      const startBeat = noteStartBeats.current[midi]
      const startRealMs = noteStartRealMs.current[midi]
      delete noteStartBeats.current[midi]
      delete noteStartRealMs.current[midi]
      const duration = Math.max((performance.now() - startRealMs) * bpm / 60000, 0.25)
      const current = useStore.getState().midiTrack
      setMidiTrack([...current, { note: midi, beat: startBeat, duration }])
    }
  }, [isRecording, isPlaying, bpm, setMidiTrack])

  const clearTrack = useCallback(() => {
    setMidiTrack([])
  }, [setMidiTrack])

  return { activeNotes, recordedNotes, isRecording, toggleRecording, soundMode, toggleSoundMode, noteOn, noteOff, clearTrack }
}
