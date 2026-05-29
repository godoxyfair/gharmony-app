import type { ChordEvent, Chord } from '@/lib/music/harmonization'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

function chordName(chord: Chord): string {
  const root = NOTE_NAMES[chord.root % 12]
  const qual =
    chord.quality === 'maj'  ? '' :
    chord.quality === 'min'  ? 'm' :
    chord.quality === 'dim'  ? 'dim' :
    chord.quality === 'maj7' ? 'maj7' :
    chord.quality === 'min7' ? 'm7' :
    chord.quality === 'dom7' ? '7' : ''
  return root + qual
}

export function buildChordSheet(chords: ChordEvent[], lyrics: string): string {
  const lastBeat = chords.reduce((m, c) => Math.max(m, c.beat + c.duration), 0)
  const numBars = Math.max(1, Math.ceil(lastBeat / 4))

  const barLines: string[] = []
  for (let bar = 0; bar < numBars; bar++) {
    const start = bar * 4
    const end = start + 4
    const barChords = chords.filter(c => c.beat >= start && c.beat < end)
    if (barChords.length > 0) {
      barLines.push('| ' + barChords.map(c => chordName(c.chord)).join(' | ') + ' |')
    }
  }

  const lines = barLines.join('\n')
  if (!lyrics.trim()) return lines
  return lines + '\n\n' + lyrics.trim()
}
