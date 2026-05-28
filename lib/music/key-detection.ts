import type { QuantizedNote } from './notes'

const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export type KeyResult = {
  key: number
  mode: 'major' | 'minor'
  confidence: number
}

function pearson(a: number[], b: number[]): number {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const ra = a[i] - ma
    const rb = b[i] - mb
    num += ra * rb
    da += ra * ra
    db += rb * rb
  }
  if (da === 0 || db === 0) return 0
  return num / Math.sqrt(da * db)
}

export function buildChroma(notes: QuantizedNote[]): number[] {
  const chroma = new Array<number>(12).fill(0)
  for (const note of notes) {
    chroma[((note.midi % 12) + 12) % 12] += note.duration
  }
  const total = chroma.reduce((s, v) => s + v, 0)
  if (total === 0) return chroma
  return chroma.map(v => v / total)
}

export function detectKey(notes: QuantizedNote[]): KeyResult | null {
  if (notes.length === 0) return null
  const chroma = buildChroma(notes)

  type Candidate = { key: number; mode: 'major' | 'minor'; score: number }
  const candidates: Candidate[] = []

  for (let root = 0; root < 12; root++) {
    const majorProfile = Array.from({ length: 12 }, (_, i) => KK_MAJOR[(i - root + 12) % 12])
    const minorProfile = Array.from({ length: 12 }, (_, i) => KK_MINOR[(i - root + 12) % 12])
    candidates.push({ key: root, mode: 'major', score: pearson(chroma, majorProfile) })
    candidates.push({ key: root, mode: 'minor', score: pearson(chroma, minorProfile) })
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  // Map Pearson range [0.4, 1.0] → [0%, 100%]
  // Tonal melody vs correct key ≈ 0.8–0.95, ambiguous short melody ≈ 0.4–0.6
  const confidence = Math.max(0, Math.min(1, (best.score - 0.4) / 0.6))

  return { key: best.key, mode: best.mode, confidence }
}

export function keyToName(key: number, mode: 'major' | 'minor'): string {
  return `${NOTE_NAMES[key]} ${mode}`
}

export function keyToAccentColor(key: number, mode: 'major' | 'minor'): string {
  if (mode === 'major') {
    const hue = Math.round(25 + (key / 11) * 50)
    return `hsl(${hue}, 65%, 55%)`
  }
  const hue = Math.round(220 + (key / 11) * 60)
  return `hsl(${hue}, 55%, 45%)`
}
