// Variant A — pure Tone.js synthesizers for all parts
import * as Tone from 'tone'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent, Chord } from '@/lib/music/harmonization'

export type StyleName = 'folk' | 'cinematic' | 'lofi' | 'rock' | 'dreampop' | 'indie'

export type MidiNote = {
  note: number
  beat: number
  duration: number
}

const CHORD_SEMITONES: Record<Chord['quality'], number[]> = {
  maj:  [0, 4, 7],
  min:  [0, 3, 7],
  dim:  [0, 3, 6],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
}

function nn(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote() as string
}

function chordNotes(chord: Chord, octave = 3): string[] {
  return CHORD_SEMITONES[chord.quality].map(s => nn(chord.root + octave * 12 + s))
}

type Disposable = { dispose(): void }

let activeParts: Tone.Part[] = []
let activeSynths: Disposable[] = []
let voicePlayer: Tone.Player | null = null
let voiceBus: Tone.Volume | null = null
let humPlayer: Tone.Player | null = null
let humBus: Tone.Volume | null = null
let pianoBus: Tone.Volume | null = null
let livePianoSynth: Tone.PolySynth | null = null
let livePianoSampler: Tone.Sampler | null = null
let livePianoBus: Tone.Volume | null = null
let livePianoMode: 'synth' | 'piano' = 'synth'
let livePianoLoadPromise: Promise<void> | null = null

const PIANO_URLS: Record<string, string> = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
  A7: 'A7.mp3', C8: 'C8.mp3',
}

function cleanupPiano() {
  try { pianoBus?.dispose() } catch {}
  pianoBus = null
}

function cleanupLivePiano() {
  try { livePianoSynth?.dispose() } catch {}
  try { livePianoSampler?.dispose() } catch {}
  try { livePianoBus?.dispose() } catch {}
  livePianoSynth = null
  livePianoSampler = null
  livePianoBus = null
  livePianoLoadPromise = null
}

export async function ensureLivePiano(mode: 'synth' | 'piano' = 'synth') {
  await Tone.start()
  if (livePianoBus && livePianoMode === mode) {
    if (livePianoLoadPromise) await livePianoLoadPromise
    return
  }
  cleanupLivePiano()
  livePianoMode = mode
  livePianoBus = new Tone.Volume(mode === 'piano' ? 6 : -2)
  livePianoBus.connect(Tone.getContext().rawContext.destination)
  if (mode === 'piano') {
    livePianoLoadPromise = new Promise<void>((resolve, reject) => {
      livePianoSampler = new Tone.Sampler({
        urls: PIANO_URLS,
        baseUrl: '/samples/piano/',
        onload: resolve,
        onerror: reject,
      })
    }).then(() => { livePianoLoadPromise = null })
    livePianoSampler!.connect(livePianoBus)
    await livePianoLoadPromise
  } else {
    livePianoSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 1.5 },
      volume: 0,
    })
    livePianoSynth.connect(livePianoBus)
  }
}

export function livePianoNoteOn(midi: number) {
  if (livePianoMode === 'piano') {
    livePianoSampler?.triggerAttack(nn(midi))
  } else {
    livePianoSynth?.triggerAttack(nn(midi))
  }
}

export function livePianoNoteOff(midi: number) {
  if (livePianoMode === 'piano') {
    livePianoSampler?.triggerRelease(nn(midi))
  } else {
    livePianoSynth?.triggerRelease(nn(midi))
  }
}


export function setPianoMuted(muted: boolean) {
  if (pianoBus) pianoBus.volume.value = muted ? -Infinity : 0
  if (livePianoBus) livePianoBus.volume.value = muted ? -Infinity : (livePianoMode === 'piano' ? 6 : -2)
}

function cleanupVoice() {
  try { voicePlayer?.stop(0); voicePlayer?.unsync(); voicePlayer?.dispose() } catch {}
  try { voiceBus?.dispose() } catch {}
  voicePlayer = null
  voiceBus = null
}

function cleanupHum() {
  try { humPlayer?.stop(0); humPlayer?.unsync(); humPlayer?.dispose() } catch {}
  try { humBus?.dispose() } catch {}
  humPlayer = null
  humBus = null
}

function setupVoice(buffer: AudioBuffer) {
  cleanupVoice()
  voiceBus = new Tone.Volume(6)
  voiceBus.connect(Tone.getContext().rawContext.destination)
  voicePlayer = new Tone.Player(buffer)
  voicePlayer.connect(voiceBus)
  voicePlayer.loop = true
  voicePlayer.loopEnd = buffer.duration
  voicePlayer.sync().start(0)
}

function setupHum(buffer: AudioBuffer) {
  cleanupHum()
  humBus = new Tone.Volume(6)
  humBus.connect(Tone.getContext().rawContext.destination)
  humPlayer = new Tone.Player(buffer)
  humPlayer.connect(humBus)
  humPlayer.loop = true
  humPlayer.loopEnd = buffer.duration
  humPlayer.sync().start(0)
}

export function setSynthMuted(muted: boolean) {
  Tone.getDestination().mute = muted
}

export function setVoiceMuted(muted: boolean) {
  if (voiceBus) voiceBus.volume.value = muted ? -Infinity : 6
}

export function setHumMuted(muted: boolean) {
  if (humBus) humBus.volume.value = muted ? -Infinity : 6
}

export function clearVoiceBuffer() { cleanupVoice() }
export function clearHumBuffer() { cleanupHum() }

function cleanup() {
  Tone.getTransport().stop()
  Tone.getTransport().cancel()
  for (const p of activeParts) { try { p.stop(0); p.dispose() } catch {} }
  for (const s of activeSynths) { try { s.dispose() } catch {} }
  activeParts = []
  activeSynths = []
  try { livePianoSynth?.releaseAll() } catch {}
  try { livePianoSampler?.releaseAll() } catch {}
  cleanupVoice()
  cleanupHum()
  cleanupPiano()
}

export function stopA() { cleanup() }

export async function playA(
  notes: QuantizedNote[],
  chords: ChordEvent[],
  bpm: number,
  style: StyleName,
  voiceBuffer?: AudioBuffer | null,
  humBuffer?: AudioBuffer | null,
  customDrum?: number[][] | null,
  midiTrack?: MidiNote[] | null,
): Promise<void> {
  await Tone.start()
  cleanup()

  const transport = Tone.getTransport()
  transport.bpm.value = bpm

  const bd = 60 / bpm
  const lastChordBeat = chords.length > 0 ? Math.max(...chords.map(c => c.beat + c.duration)) : 4
  const lastSec = notes.length > 0
    ? Math.max(...notes.map(n => n.startTime + n.duration))
    : lastChordBeat * bd
  const lastMidiSec = midiTrack && midiTrack.length > 0
    ? Math.max(...midiTrack.map(n => (n.beat + n.duration) * bd))
    : 0
  const loopBars = Math.max(2, Math.ceil(Math.max(lastSec, lastMidiSec) / (4 * bd)))
  transport.loop = true
  transport.loopStart = 0
  transport.loopEnd = loopBars * 4 * bd

  const parts: Tone.Part[] = []
  const synths: Disposable[] = []

  // ── melody: Tone.js PolySynth with custom piano harmonics ────────────
  const melSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'custom' as const,
      partials: [1.0, 0.45, 0.22, 0.10, 0.05, 0.025, 0.012, 0.006],
    },
    envelope: { attack: 0.004, decay: 0.08, sustain: 0.2, release: 0.15 },
    volume: -2,
  })

  let melDest: Disposable & Tone.ToneAudioNode
  if (style === 'cinematic') {
    melDest = new Tone.Reverb({ decay: 3, wet: 0.5 }).toDestination()
  } else if (style === 'lofi') {
    melDest = new Tone.Filter(3000, 'lowpass').toDestination()
  } else if (style === 'rock') {
    melDest = new Tone.Gain(1).toDestination()
  } else if (style === 'dreampop') {
    melDest = new Tone.Reverb({ decay: 5, wet: 0.55 }).toDestination()
  } else {
    melDest = new Tone.Gain(1).toDestination()
  }
  melSynth.connect(melDest)

  const melPart = new Tone.Part(
    (time: number, v: { nn: string; dur: number }) =>
      melSynth.triggerAttackRelease(v.nn, v.dur, time),
    notes.map(note => ({ time: note.startTime, nn: nn(note.midi), dur: note.duration }))
  )
  parts.push(melPart)
  synths.push(melSynth, melDest)

  // ── chords ────────────────────────────────────────────────────────────
  const chordEvents = chords.map(c => ({
    time: c.beat * bd,
    ns: chordNotes(c.chord, 3),
    dur: c.duration * bd,
  }))

  if (style === 'folk') {
    const cSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.7, release: 1.2 },
      volume: -14,
    })
    const cRev = new Tone.Reverb({ decay: 1.2, wet: 0.2 }).toDestination()
    cSynth.connect(cRev)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cRev)
  } else if (style === 'cinematic') {
    const cSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      envelope: { attack: 0.5, decay: 0.2, sustain: 0.9, release: 2.0 },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
      volume: -16,
    })
    const cRev = new Tone.Reverb({ decay: 4, wet: 0.6 }).toDestination()
    cSynth.connect(cRev)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cRev)
  } else if (style === 'lofi') {
    const cSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 8,
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.5 },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.3 },
      volume: -16,
    })
    const cFilter = new Tone.Filter(2000, 'lowpass').toDestination()
    cSynth.connect(cFilter)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cFilter)
  } else if (style === 'rock') {
    const cSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' as const },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.85, release: 0.5 },
      volume: -18,
    })
    const cFilter = new Tone.Filter(2200, 'lowpass')
    const cDist = new Tone.Chebyshev(4).toDestination()
    cFilter.connect(cDist)
    cSynth.connect(cFilter)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cFilter, cDist)
  } else if (style === 'dreampop') {
    const cSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      envelope: { attack: 0.8, decay: 0.2, sustain: 0.9, release: 2.5 },
      modulationEnvelope: { attack: 0.8, decay: 0, sustain: 1, release: 1.0 },
      volume: -18,
    })
    const cChorus = new Tone.Chorus(4, 2.5, 0.5)
    cChorus.start()
    const cRev = new Tone.Reverb({ decay: 5, wet: 0.65 }).toDestination()
    cChorus.connect(cRev)
    cSynth.connect(cChorus)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cChorus, cRev)
  } else {
    // indie: clean triangle chords, light room reverb
    const cSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.04, decay: 0.15, sustain: 0.5, release: 1.0 },
      volume: -15,
    })
    const cRev = new Tone.Reverb({ decay: 1.5, wet: 0.25 }).toDestination()
    cSynth.connect(cRev)
    parts.push(new Tone.Part(
      (time: number, v: { ns: string[]; dur: number }) =>
        cSynth.triggerAttackRelease(v.ns, v.dur, time),
      chordEvents
    ))
    synths.push(cSynth, cRev)
  }

  // ── bass ──────────────────────────────────────────────────────────────
  const bassOct = (style === 'cinematic' || style === 'dreampop') ? 1 : 2
  const bassAttack = style === 'cinematic' ? 0.4 : style === 'dreampop' ? 0.6 : 0.04
  const bassRelease = style === 'cinematic' ? 1.2 : style === 'dreampop' ? 1.5 : 0.4
  const bassVolume = style === 'cinematic' ? 0 : (style === 'rock' || style === 'dreampop') ? -2 : style === 'indie' ? -6 : -4
  const bassOscType = style === 'rock' ? 'sawtooth' as const : 'sine' as const
  const seenBassBeats = new Set<number>()
  const bassEvents = chords
    .sort((a, b) => a.beat - b.beat)
    .filter(c => { if (seenBassBeats.has(c.beat)) return false; seenBassBeats.add(c.beat); return true })
    .map(c => ({
      time: c.beat * bd,
      nn: nn(c.chord.root + bassOct * 12),
      dur: (c.duration * 0.5) * bd,
    }))

  const bSynth = new Tone.MonoSynth({
    oscillator: { type: bassOscType },
    envelope: {
      attack: bassAttack,
      decay: 0.1,
      sustain: 0.9,
      release: bassRelease,
    },
    volume: bassVolume,
  }).toDestination()
  parts.push(new Tone.Part(
    (time: number, v: { nn: string; dur: number }) =>
      bSynth.triggerAttackRelease(v.nn, v.dur, time),
    bassEvents
  ))
  synths.push(bSynth)

  // ── drums ─────────────────────────────────────────────────────────────
  if (customDrum) {
    const stepSecs = bd / 4

    const ckick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: 2 }).toDestination()
    const csnare = new Tone.NoiseSynth({
      noise: { type: 'white' as const },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
      volume: -6,
    }).toDestination()
    const chat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.025, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -14,
    }).toDestination()
    chat.frequency.value = 600
    const cohat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.06 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5, volume: -16,
    }).toDestination()
    cohat.frequency.value = 500
    synths.push(ckick, csnare, chat, cohat)

    type CustomDrumEvent = { row: number; vel: number }
    const drumEvents: { time: number; row: number; vel: number }[] = []
    for (let bar = 0; bar < loopBars; bar++) {
      const barStart = bar * 4 * bd
      for (let step = 0; step < 16; step++) {
        for (let row = 0; row < 4; row++) {
          const v = customDrum[row]?.[step] ?? 0
          if (v > 0) drumEvents.push({ time: barStart + step * stepSecs, row, vel: v })
        }
      }
    }

    parts.push(new Tone.Part(
      (time: number, ev: CustomDrumEvent) => {
        const velocity = ev.vel === 1 ? 0.6 : ev.vel === 2 ? 0.85 : 1.0
        if (ev.row === 0) ckick.triggerAttackRelease('C1', '8n', time, velocity)
        else if (ev.row === 1) csnare.triggerAttackRelease('8n', time, velocity)
        else if (ev.row === 2) chat.triggerAttackRelease('16n', time, velocity)
        else cohat.triggerAttackRelease('8n', time, velocity)
      },
      drumEvents
    ))
  } else {
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: 2 }).toDestination()
    synths.push(kick)

    if (style === 'folk') {
      const hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -14,
      }).toDestination()
      hat.frequency.value = 400
      synths.push(hat)

      const drumEvents: { time: number; t: 'k' | 'h' }[] = []
      for (let b = 0; b < loopBars * 4; b++) {
        drumEvents.push({ time: b * bd, t: 'h' })
        if (b % 4 === 0 || b % 4 === 2) drumEvents.push({ time: b * bd, t: 'k' })
      }
      parts.push(new Tone.Part(
        (time: number, v: { t: 'k' | 'h' }) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else hat.triggerAttackRelease('16n', time)
        },
        drumEvents
      ))
    } else if (style === 'cinematic') {
      kick.volume.value = -4
      const kRev = new Tone.Reverb({ decay: 3, wet: 0.7 }).toDestination()
      kick.disconnect()
      kick.connect(kRev)
      synths.push(kRev)
      parts.push(new Tone.Part(
        (time: number) => kick.triggerAttackRelease('C1', '4n', time),
        Array.from({ length: loopBars }, (_, bar) => ({ time: bar * 4 * bd }))
      ))
    } else if (style === 'lofi') {
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' as const },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
        volume: -10,
      }).toDestination()
      const hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.02, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 3000,
        octaves: 1.5,
        volume: -16,
      }).toDestination()
      hat.frequency.value = 600
      synths.push(snare, hat)

      const swing = 0.08 * bd
      const drumEvents: { time: number; t: 'k' | 's' | 'h' }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const bs = bar * 4 * bd
        drumEvents.push({ time: bs, t: 'k' })
        drumEvents.push({ time: bs + 2 * bd, t: 's' })
        for (let e = 0; e < 8; e++) {
          drumEvents.push({ time: bs + e * (bd / 2) + (e % 2 === 1 ? swing : 0), t: 'h' })
        }
      }
      parts.push(new Tone.Part(
        (time: number, v: { t: 'k' | 's' | 'h' }) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('32n', time)
        },
        drumEvents
      ))
    } else if (style === 'rock') {
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' as const },
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
        volume: -6,
      }).toDestination()
      const hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -12,
      }).toDestination()
      hat.frequency.value = 800
      synths.push(snare, hat)

      const drumEvents: { time: number; t: 'k' | 's' | 'h' }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const bs = bar * 4 * bd
        drumEvents.push({ time: bs, t: 'k' })
        drumEvents.push({ time: bs + 2 * bd, t: 'k' })
        drumEvents.push({ time: bs + bd, t: 's' })
        drumEvents.push({ time: bs + 3 * bd, t: 's' })
        for (let e = 0; e < 8; e++) {
          drumEvents.push({ time: bs + e * (bd / 2), t: 'h' })
        }
      }
      parts.push(new Tone.Part(
        (time: number, v: { t: 'k' | 's' | 'h' }) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('16n', time)
        },
        drumEvents
      ))
    } else if (style === 'dreampop') {
      kick.volume.value = -8
      const kRev = new Tone.Reverb({ decay: 4, wet: 0.8 }).toDestination()
      kick.disconnect()
      kick.connect(kRev)
      synths.push(kRev)

      const snare = new Tone.NoiseSynth({
        noise: { type: 'pink' as const },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
        volume: -14,
      })
      const sRev = new Tone.Reverb({ decay: 3, wet: 0.7 }).toDestination()
      snare.connect(sRev)
      synths.push(snare, sRev)

      const drumEvents: { time: number; t: 'k' | 's' }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const bs = bar * 4 * bd
        drumEvents.push({ time: bs, t: 'k' })
        drumEvents.push({ time: bs + 2 * bd, t: 's' })
      }
      parts.push(new Tone.Part(
        (time: number, v: { t: 'k' | 's' }) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '4n', time)
          else snare.triggerAttackRelease('4n', time)
        },
        drumEvents
      ))
    } else {
      // indie: kick on 1 and and-of-2, snare on 2 and 4, 8th hats
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' as const },
        envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.04 },
        volume: -8,
      }).toDestination()
      const hat = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.025, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 3500,
        octaves: 1.5,
        volume: -18,
      }).toDestination()
      hat.frequency.value = 700
      synths.push(snare, hat)

      const drumEvents: { time: number; t: 'k' | 's' | 'h' }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const bs = bar * 4 * bd
        drumEvents.push({ time: bs, t: 'k' })
        drumEvents.push({ time: bs + 1.5 * bd, t: 'k' })
        drumEvents.push({ time: bs + bd, t: 's' })
        drumEvents.push({ time: bs + 3 * bd, t: 's' })
        for (let e = 0; e < 8; e++) {
          drumEvents.push({ time: bs + e * (bd / 2), t: 'h' })
        }
      }
      parts.push(new Tone.Part(
        (time: number, v: { t: 'k' | 's' | 'h' }) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('16n', time)
        },
        drumEvents
      ))
    }
  }

  // ── midi track — routed through live piano instrument to avoid duplication ─
  if (midiTrack && midiTrack.length > 0) {
    cleanupPiano()
    const midiEvents = midiTrack.map(note => ({
      time: note.beat * bd,
      midiNum: note.note,
      dur: Math.max(note.duration * bd, 0.05),
    }))
    parts.push(new Tone.Part(
      (time: number, v: { midiNum: number; dur: number }) => {
        if (livePianoMode === 'piano' && livePianoSampler) {
          livePianoSampler.triggerAttackRelease(nn(v.midiNum), v.dur, time)
        } else if (livePianoSynth) {
          livePianoSynth.triggerAttackRelease(nn(v.midiNum), v.dur, time)
        }
      },
      midiEvents,
    ))
  }

  activeParts = parts
  activeSynths = synths

  if (voiceBuffer) setupVoice(voiceBuffer)
  if (humBuffer) setupHum(humBuffer)

  parts.forEach(p => p.start(0))
  transport.start()
}
