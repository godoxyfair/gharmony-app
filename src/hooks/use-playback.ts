'use client'

import { useCallback, useRef, useState } from 'react'
import { getTransport } from 'tone'
import { play as playEngine, stop as stopEngine, setSynthMuted as setSynthMutedEngine, setVoiceMuted as setVoiceMutedEngine, setHumMuted as setHumMutedEngine, clearVoiceBuffer as clearVoiceEngine, clearHumBuffer as clearHumEngine, setPianoMuted as setPianoMutedEngine } from '@/lib/audio/playback'
import { useStore } from '@/src/store/useStore'
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
  const lastBeatIntRef = useRef(-1)
  const rafRef = useRef<number | null>(null)

  const synthMuted = useStore(s => s.synthMuted)
  const storeSynthMuted = useStore(s => s.setSynthMuted)
  const voiceMuted = useStore(s => s.voiceMuted)
  const storeVoiceMuted = useStore(s => s.setVoiceMuted)
  const humMuted = useStore(s => s.humMuted)
  const storeHumMuted = useStore(s => s.setHumMuted)
  const midiMuted = useStore(s => s.midiMuted)
  const storeMidiMuted = useStore(s => s.setMidiMuted)

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
        const voiceBuffer = useStore.getState().voiceBuffer
        const vMuted = useStore.getState().voiceMuted
        const humBuffer = useStore.getState().humBuffer
        const hMuted = useStore.getState().humMuted
        lastSecsRef.current = 0
        const customDrum = useStore.getState().useCustomDrum ? useStore.getState().stepGrid : null
        const midiTrack = useStore.getState().midiMuted ? null : useStore.getState().midiTrack
        playEngine(notes, chords, bpm, styleRef.current, vMuted ? null : voiceBuffer, hMuted ? null : humBuffer, customDrum, midiTrack).then(() => {
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

      const beatInt = Math.floor(currentBeat)
      if (beatInt !== lastBeatIntRef.current) {
        lastBeatIntRef.current = beatInt
        useStore.getState().setBeatTick(beatInt)
      }
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
    useStore.getState().setLoopLengthBeats(loopBars * 4)
    const voiceBuffer = useStore.getState().voiceBuffer
    const vMuted = useStore.getState().voiceMuted
    const humBuffer = useStore.getState().humBuffer
    const hMuted = useStore.getState().humMuted
    const customDrum = useStore.getState().useCustomDrum ? useStore.getState().stepGrid : null
    const midiTrack = useStore.getState().midiMuted ? null : useStore.getState().midiTrack
    await playEngine(notes, chords, bpm, styleRef.current, vMuted ? null : voiceBuffer, hMuted ? null : humBuffer, customDrum, midiTrack)
    stopRaf()
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, stopRaf])

  const stop = useCallback(() => {
    stopEngine()
    playingRef.current = false
    setIsPlaying(false)
    setActiveBeat(-1)
    lastBeatIntRef.current = -1
    stopRaf()
  }, [stopRaf])

  const setStyle = useCallback(async (s: StyleName) => {
    styleRef.current = s
    setStyleState(s)
    if (playingRef.current && argsRef.current) {
      const { notes, chords, bpm } = argsRef.current
      const voiceBuffer = useStore.getState().voiceBuffer
      const vMuted = useStore.getState().voiceMuted
      const humBuffer = useStore.getState().humBuffer
      const hMuted = useStore.getState().humMuted
      const customDrum = useStore.getState().useCustomDrum ? useStore.getState().stepGrid : null
      const midiTrackStyle = useStore.getState().midiMuted ? null : useStore.getState().midiTrack
      await playEngine(notes, chords, bpm, s, vMuted ? null : voiceBuffer, hMuted ? null : humBuffer, customDrum, midiTrackStyle)
    }
  }, [])

  const queueChordsUpdate = useCallback((newChords: ChordEvent[]) => {
    pendingChordsRef.current = newChords
  }, [])

  const toggleSynthMuted = useCallback(() => {
    const next = !useStore.getState().synthMuted
    storeSynthMuted(next)
    setSynthMutedEngine(next)
  }, [storeSynthMuted])

  const toggleVoiceMuted = useCallback(() => {
    const next = !useStore.getState().voiceMuted
    storeVoiceMuted(next)
    setVoiceMutedEngine(next)
  }, [storeVoiceMuted])

  const toggleHumMuted = useCallback(() => {
    const next = !useStore.getState().humMuted
    storeHumMuted(next)
    setHumMutedEngine(next)
  }, [storeHumMuted])

  const deleteVoice = useCallback(() => {
    clearVoiceEngine()
    useStore.getState().setVoiceBuffer(null)
  }, [])

  const deleteHum = useCallback(() => {
    clearHumEngine()
    useStore.getState().setHumBuffer(null)
  }, [])

  const toggleMidiMuted = useCallback(() => {
    const next = !useStore.getState().midiMuted
    storeMidiMuted(next)
    setPianoMutedEngine(next)
  }, [storeMidiMuted])

  const deleteMidiTrack = useCallback(() => {
    useStore.getState().setMidiTrack([])
  }, [])

  return {
    play,
    stop,
    isPlaying,
    style,
    setStyle,
    activeBeat,
    queueChordsUpdate,
    synthMuted,
    toggleSynthMuted,
    voiceMuted,
    toggleVoiceMuted,
    humMuted,
    toggleHumMuted,
    deleteVoice,
    deleteHum,
    midiMuted,
    toggleMidiMuted,
    deleteMidiTrack,
  }
}
