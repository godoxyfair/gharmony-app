import { create } from 'zustand'
import type { KeyResult } from '@/lib/music/key-detection'
import type { ChordEvent } from '@/lib/music/harmonization'

type AppState = {
  accentColor: string
  setAccentColor: (color: string) => void
  detectedKey: KeyResult | null
  setDetectedKey: (k: KeyResult | null) => void
  chords: ChordEvent[] | null
  setChords: (c: ChordEvent[] | null) => void
}

export const useStore = create<AppState>((set) => ({
  accentColor: '#c4a35a',
  setAccentColor: (color) => set({ accentColor: color }),
  detectedKey: null,
  setDetectedKey: (k) => set({ detectedKey: k }),
  chords: null,
  setChords: (c) => set({ chords: c }),
}))
