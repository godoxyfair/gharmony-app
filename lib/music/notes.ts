const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440)
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function midiToName(midi: number): string {
  const semitone = Math.round(midi) % 12
  const octave = Math.floor(Math.round(midi) / 12) - 1
  return `${NOTE_NAMES[(semitone + 12) % 12]}${octave}`
}

export function quantizeToSemitone(midi: number): number {
  return Math.round(midi)
}

/**
 * Snap a time value to the nearest 1/8 beat grid.
 * @param time - time in seconds
 * @param bpm  - tempo in beats per minute
 */
export function snapToGrid(time: number, bpm: number): number {
  const beatDuration = 60 / bpm
  const eighthDuration = beatDuration / 2
  return Math.round(time / eighthDuration) * eighthDuration
}

export type RawDetection = {
  freq: number
  clarity: number
  time: number
}

export type QuantizedNote = {
  midi: number
  startTime: number
  duration: number
  clarity: number
}

/**
 * Convert a stream of raw pitch detections to quantized MIDI notes.
 * Groups consecutive same-pitch detections, snaps boundaries to 1/8 grid.
 */
export function quantizeDetections(
  detections: RawDetection[],
  bpm: number,
  clarityThreshold = 0.60,
): QuantizedNote[] {
  if (detections.length === 0) return []

  const filtered = detections.filter(d => d.clarity >= clarityThreshold)
  if (filtered.length === 0) return []

  const beatDuration = 60 / bpm
  const eighthDuration = beatDuration / 2

  const notes: QuantizedNote[] = []
  let groupStart = filtered[0]
  let groupMidi = quantizeToSemitone(freqToMidi(filtered[0].freq))
  let groupEnd = filtered[0]
  let claritySum = filtered[0].clarity
  let groupCount = 1

  const flushGroup = () => {
    const actualDuration = groupEnd.time - groupStart.time
    if (groupCount >= 3 && actualDuration >= 0.07) {
      const startSnapped = snapToGrid(groupStart.time, bpm)
      const endSnapped = snapToGrid(groupEnd.time, bpm) || eighthDuration
      const duration = Math.max(endSnapped - startSnapped, eighthDuration)
      notes.push({
        midi: groupMidi,
        startTime: startSnapped,
        duration,
        clarity: claritySum / groupCount,
      })
    }
  }

  for (let i = 1; i < filtered.length; i++) {
    const d = filtered[i]
    const midi = quantizeToSemitone(freqToMidi(d.freq))
    const gap = d.time - groupEnd.time

    if (midi === groupMidi && gap < 0.20) {
      groupEnd = d
      claritySum += d.clarity
      groupCount++
    } else {
      flushGroup()
      groupStart = d
      groupMidi = midi
      groupEnd = d
      claritySum = d.clarity
      groupCount = 1
    }
  }

  flushGroup()

  return notes
}
