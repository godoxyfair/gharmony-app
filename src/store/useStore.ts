import { create } from 'zustand'
import type { KeyResult } from '@/lib/music/key-detection'
import type { ChordEvent } from '@/lib/music/harmonization'
import { emptyGrid } from '@/lib/audio/drum-patterns'
import type { StepGrid } from '@/lib/audio/drum-patterns'
import type { MidiNote } from '@/lib/audio/playback'

type AppState = {
  accentColor: string
  setAccentColor: (color: string) => void
  detectedKey: KeyResult | null
  setDetectedKey: (k: KeyResult | null) => void
  chords: ChordEvent[] | null
  setChords: (c: ChordEvent[] | null) => void
  voiceBuffer: AudioBuffer | null
  setVoiceBuffer: (b: AudioBuffer | null) => void
  voiceMuted: boolean
  setVoiceMuted: (m: boolean) => void
  synthMuted: boolean
  setSynthMuted: (m: boolean) => void
  humBuffer: AudioBuffer | null
  setHumBuffer: (b: AudioBuffer | null) => void
  humMuted: boolean
  setHumMuted: (m: boolean) => void
  stepGrid: StepGrid
  setStepGrid: (g: StepGrid) => void
  useCustomDrum: boolean
  setUseCustomDrum: (v: boolean) => void
  midiTrack: MidiNote[]
  setMidiTrack: (t: MidiNote[]) => void
  midiMuted: boolean
  setMidiMuted: (m: boolean) => void
  loopLengthBeats: number
  setLoopLengthBeats: (b: number) => void
  lyrics: string
  setLyrics: (l: string) => void
  beatTick: number
  setBeatTick: (t: number) => void
}

export const useStore = create<AppState>((set) => ({
  accentColor: '#c4a35a',
  setAccentColor: (color) => set({ accentColor: color }),
  detectedKey: null,
  setDetectedKey: (k) => set({ detectedKey: k }),
  chords: null,
  setChords: (c) => set({ chords: c }),
  voiceBuffer: null,
  setVoiceBuffer: (b) => set({ voiceBuffer: b }),
  voiceMuted: false,
  setVoiceMuted: (m) => set({ voiceMuted: m }),
  synthMuted: false,
  setSynthMuted: (m) => set({ synthMuted: m }),
  humBuffer: null,
  setHumBuffer: (b) => set({ humBuffer: b }),
  humMuted: false,
  setHumMuted: (m) => set({ humMuted: m }),
  stepGrid: emptyGrid(),
  setStepGrid: (g) => set({ stepGrid: g }),
  useCustomDrum: false,
  setUseCustomDrum: (v) => set({ useCustomDrum: v }),
  midiTrack: [],
  setMidiTrack: (t) => set({ midiTrack: t }),
  midiMuted: false,
  setMidiMuted: (m) => set({ midiMuted: m }),
  loopLengthBeats: 8,
  setLoopLengthBeats: (b) => set({ loopLengthBeats: b }),
  lyrics: '',
  setLyrics: (l) => set({ lyrics: l }),
  beatTick: -1,
  setBeatTick: (t) => set({ beatTick: t }),
}))
