import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent } from '@/lib/music/harmonization'

const PPQ = 480

function encodeVlq(value: number): number[] {
  const bytes: number[] = []
  bytes.push(value & 0x7f)
  value >>= 7
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80)
    value >>= 7
  }
  return bytes
}

function be16(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff]
}

function be32(n: number): number[] {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

type RawEvent = { tick: number; bytes: number[] }

function toDeltaBytes(events: RawEvent[]): number[] {
  events.sort((a, b) => a.tick - b.tick)
  const out: number[] = []
  let prev = 0
  for (const ev of events) {
    out.push(...encodeVlq(ev.tick - prev), ...ev.bytes)
    prev = ev.tick
  }
  return out
}

function buildTrack(eventBytes: number[]): number[] {
  const body = [...eventBytes, ...encodeVlq(0), 0xff, 0x2f, 0x00]
  return [0x4d, 0x54, 0x72, 0x6b, ...be32(body.length), ...body]
}

export function buildMidi(
  notes: QuantizedNote[],
  chords: ChordEvent[],
  bpm: number,
): ArrayBuffer {
  const usPerBeat = Math.round(60_000_000 / bpm)

  // Track 0: tempo
  const tempoTrack = buildTrack([
    ...encodeVlq(0),
    0xff, 0x51, 0x03,
    (usPerBeat >> 16) & 0xff,
    (usPerBeat >> 8) & 0xff,
    usPerBeat & 0xff,
  ])

  // Track 1: melody (times in seconds → ticks)
  const melRaw: RawEvent[] = []
  for (const n of notes) {
    const onTick = Math.round(n.startTime * (bpm / 60) * PPQ)
    const offTick = Math.round((n.startTime + n.duration) * (bpm / 60) * PPQ)
    melRaw.push({ tick: onTick, bytes: [0x90, n.midi & 0x7f, 80] })
    melRaw.push({ tick: offTick, bytes: [0x80, n.midi & 0x7f, 0] })
  }
  const melodyTrack = buildTrack(toDeltaBytes(melRaw))

  // Track 2: chord roots (times in beats → ticks)
  const chordRaw: RawEvent[] = []
  for (const c of chords) {
    const midi = (c.chord.root + 48) & 0x7f  // octave 3 (C3=48)
    const onTick = Math.round(c.beat * PPQ)
    const offTick = Math.round((c.beat + c.duration) * PPQ)
    chordRaw.push({ tick: onTick, bytes: [0x91, midi, 80] })
    chordRaw.push({ tick: offTick, bytes: [0x81, midi, 0] })
  }
  const chordTrack = buildTrack(toDeltaBytes(chordRaw))

  const header = [
    0x4d, 0x54, 0x68, 0x64, ...be32(6),
    ...be16(1),  // format 1
    ...be16(3),  // 3 tracks
    ...be16(PPQ),
  ]

  const all = [...header, ...tempoTrack, ...melodyTrack, ...chordTrack]
  const buf = new ArrayBuffer(all.length)
  new Uint8Array(buf).set(all)
  return buf
}
