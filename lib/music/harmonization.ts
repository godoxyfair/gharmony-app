import type { QuantizedNote } from './notes'

const BEATS_PER_BAR = 4
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export type MelodyNote = {
  midi: number
  beat: number
  duration: number
}

export type Chord = {
  root: number
  quality: 'maj' | 'min' | 'dim' | 'maj7' | 'min7' | 'dom7'
  inversion: 0 | 1 | 2
}

export type ChordEvent = {
  chord: Chord
  beat: number
  duration: number
}

// [third, fifth] intervals in semitones
const CHORD_INTERVALS: Record<Chord['quality'], [number, number]> = {
  maj:  [4, 7],
  min:  [3, 7],
  dim:  [3, 6],
  maj7: [4, 7],
  min7: [3, 7],
  dom7: [4, 7],
}

const MAJOR_STEPS    = [0, 2, 4, 5, 7, 9, 11]
const MAJOR_QUALS: Chord['quality'][] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']

const MINOR_STEPS    = [0, 2, 3, 5, 7, 8, 10]
const MINOR_QUALS: Chord['quality'][] = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj']

// Fallback degree sequences (indices into the 7-triad array) — 4-chord patterns, cycled for longer melodies
const MAJOR_FALLBACKS: number[][] = [
  [0, 4, 5, 3],  // I–V–vi–IV
  [0, 3, 4, 0],  // I–IV–V–I
  [0, 5, 3, 4],  // I–vi–IV–V
  [0, 3, 0, 4],  // I–IV–I–V
  [0, 4, 3, 4],  // I–V–IV–V
  [0, 1, 4, 0],  // I–ii–V–I
  [5, 3, 0, 4],  // vi–IV–I–V
  [0, 2, 3, 4],  // I–iii–IV–V
]

const MINOR_FALLBACKS: number[][] = [
  [0, 6, 5, 6],  // i–VII–VI–VII
  [0, 3, 6, 2],  // i–iv–VII–III
  [0, 5, 2, 6],  // i–VI–III–VII
  [0, 3, 0, 4],  // i–iv–i–v
  [0, 6, 5, 4],  // i–VII–VI–v
  [0, 2, 6, 3],  // i–III–VII–iv
  [0, 5, 6, 0],  // i–VI–VII–i
  [0, 4, 5, 6],  // i–v–VI–VII
]

export function getDiatonicTriads(key: number, mode: 'major' | 'minor'): Chord[] {
  const steps   = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS
  const quals   = mode === 'major' ? MAJOR_QUALS : MINOR_QUALS
  return steps.map((step, i) => ({
    root:      (key + step) % 12,
    quality:   quals[i],
    inversion: 0,
  }))
}

function chordContainsPitch(chord: Chord, pc: number): boolean {
  const [third, fifth] = CHORD_INTERVALS[chord.quality]
  const r = chord.root % 12
  return pc === r || pc === (r + third) % 12 || pc === (r + fifth) % 12
}

function dominantPitchInBar(notes: MelodyNote[], barStart: number, barEnd: number): number | null {
  const inBar = notes.filter(n => n.beat < barEnd && n.beat + n.duration > barStart)
  if (inBar.length === 0) return null

  const weight = new Map<number, number>()
  for (const note of inBar) {
    const pc = ((note.midi % 12) + 12) % 12
    const beatInBar = note.beat - barStart
    // beats 0 and 2 are strong beats — double weight
    const bonus = (beatInBar >= 0 && beatInBar < 1) || (beatInBar >= 2 && beatInBar < 3) ? 2 : 1
    const overlapStart = Math.max(note.beat, barStart)
    const overlapEnd   = Math.min(note.beat + note.duration, barEnd)
    weight.set(pc, (weight.get(pc) ?? 0) + (overlapEnd - overlapStart) * bonus)
  }

  let maxPc = -1, maxW = -1
  for (const [pc, w] of weight) {
    if (w > maxW) { maxW = w; maxPc = pc }
  }
  return maxPc >= 0 ? maxPc : null
}

function buildFallback(key: number, mode: 'major' | 'minor', barCount: number): ChordEvent[] {
  const triads   = getDiatonicTriads(key, mode)
  const template = (mode === 'major' ? MAJOR_FALLBACKS : MINOR_FALLBACKS)[key % 8]
  return Array.from({ length: barCount }, (_, bar) => ({
    chord:    triads[template[bar % template.length]],
    beat:     bar * BEATS_PER_BAR,
    duration: BEATS_PER_BAR,
  }))
}

// Convert QuantizedNote[] (startTime in seconds) → MelodyNote[] (beat units)
export function quantizedToMelody(notes: QuantizedNote[], bpm: number): MelodyNote[] {
  const beatDur = 60 / bpm
  return notes.map(n => ({
    midi:     n.midi,
    beat:     n.startTime / beatDur,
    duration: n.duration  / beatDur,
  }))
}

export function harmonize(melody: MelodyNote[], key: number, mode: 'major' | 'minor'): ChordEvent[] {
  if (melody.length === 0) return []

  const triads  = getDiatonicTriads(key, mode)
  const tonic   = triads[0]
  const dominant = triads[4]

  const lastBeat = Math.max(...melody.map(n => n.beat + n.duration))
  const barCount = Math.max(2, Math.ceil(lastBeat / BEATS_PER_BAR))

  const rawChords: (Chord | null)[] = Array.from({ length: barCount }, (_, bar) => {
    const pc = dominantPitchInBar(melody, bar * BEATS_PER_BAR, (bar + 1) * BEATS_PER_BAR)
    if (pc === null) return null
    const matching = triads.filter(c => chordContainsPitch(c, pc))
    return matching.length > 0 ? matching[0] : null
  })

  const validCount = rawChords.filter(Boolean).length
  if (validCount < barCount / 2) return buildFallback(key, mode, barCount)

  const progression: Chord[] = rawChords.map(c => c ?? tonic)

  // All bars same chord → algorithm produced nothing interesting
  if (progression.every(c => c.root === progression[0].root)) {
    return buildFallback(key, mode, barCount)
  }

  // Constraint: tonic on bar 1
  progression[0] = tonic

  // Constraint: tonic or dominant on final bar
  const last = progression[barCount - 1]
  if (last.root !== tonic.root && last.root !== dominant.root) {
    progression[barCount - 1] = tonic
  }

  // Constraint: no more than 2 consecutive same chord
  for (let i = 2; i < progression.length; i++) {
    if (
      progression[i].root === progression[i - 1].root &&
      progression[i - 1].root === progression[i - 2].root
    ) {
      const sub = triads.find(t => t.root !== progression[i].root)
      if (sub) progression[i] = sub
    }
  }

  return progression.map((chord, bar) => ({
    chord,
    beat:     bar * BEATS_PER_BAR,
    duration: BEATS_PER_BAR,
  }))
}

const HARMONIC_SUBS: Partial<Record<number, number>> = {
  0: 5, 5: 0,
  3: 1, 1: 3,
  4: 6, 6: 4,
}

export function harmonicSubstitute(chord: Chord, key: number, mode: 'major' | 'minor'): Chord | null {
  const triads = getDiatonicTriads(key, mode)
  const degree = triads.findIndex(t => t.root === chord.root)
  if (degree < 0) return null
  const subDegree = HARMONIC_SUBS[degree]
  if (subDegree === undefined) return null
  return triads[subDegree]
}

export function chordToName(chord: Chord): string {
  const root = NOTE_NAMES[chord.root % 12]
  switch (chord.quality) {
    case 'maj':  return root
    case 'min':  return `${root}m`
    case 'dim':  return `${root}°`
    case 'maj7': return `${root}maj7`
    case 'min7': return `${root}m7`
    case 'dom7': return `${root}7`
  }
}
