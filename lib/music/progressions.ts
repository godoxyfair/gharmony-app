import { getDiatonicTriads } from './harmonization'
import type { ChordEvent } from './harmonization'

export type ProgressionEntry = {
  name: string
  mode: 'major' | 'minor'
  degrees: number[]
  label: string
}

export const PROGRESSIONS: ProgressionEntry[] = [
  // Major
  { name: 'Pop',        mode: 'major', degrees: [0, 4, 5, 3],                          label: 'I – V – vi – IV'              },
  { name: '50s',        mode: 'major', degrees: [0, 5, 3, 4],                          label: 'I – vi – IV – V'              },
  { name: 'Jazz',       mode: 'major', degrees: [1, 4, 0],                             label: 'ii – V – I'                   },
  { name: 'Pachelbel',  mode: 'major', degrees: [0, 4, 5, 2, 3, 0, 3, 4],             label: 'I – V – vi – iii – IV – I – IV – V' },
  { name: 'Royal Road', mode: 'major', degrees: [3, 4, 2, 5],                          label: 'IV – V – iii – vi'            },
  { name: 'Blues',      mode: 'major', degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], label: 'I – IV – V (12-bar)'          },
  // Minor
  { name: 'Andalusian', mode: 'minor', degrees: [0, 6, 5, 4],                          label: 'i – VII – VI – v'             },
  { name: 'Ballad',     mode: 'minor', degrees: [0, 5, 2, 6],                          label: 'i – VI – III – VII'           },
  { name: 'Epic',       mode: 'minor', degrees: [0, 4, 5, 6],                          label: 'i – v – VI – VII'             },
  { name: 'Dark',       mode: 'minor', degrees: [0, 6, 5, 6],                          label: 'i – VII – VI – VII'           },
  { name: 'Lament',     mode: 'minor', degrees: [0, 3, 2, 6],                          label: 'i – iv – III – VII'           },
  { name: 'Drama',      mode: 'minor', degrees: [0, 2, 6, 5],                          label: 'i – III – VII – VI'           },
]

export function applyProgression(entry: ProgressionEntry, key: number): ChordEvent[] {
  const triads = getDiatonicTriads(key, entry.mode)
  return entry.degrees.map((degree, i) => ({
    chord: triads[degree],
    beat: i * 4,
    duration: 4,
  }))
}
