// Variant A — pure Tone.js synthesizers for all parts
import * as Tone from 'tone'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent, Chord } from '@/lib/music/harmonization'

export type StyleName = 'folk' | 'cinematic' | 'lofi' | 'rock' | 'dreampop' | 'indie'

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

function cleanup() {
  Tone.getTransport().stop()
  Tone.getTransport().cancel()
  for (const p of activeParts) { try { p.stop(0); p.dispose() } catch {} }
  for (const s of activeSynths) { try { s.dispose() } catch {} }
  activeParts = []
  activeSynths = []
}

export function stopA() { cleanup() }

export async function playA(
  notes: QuantizedNote[],
  chords: ChordEvent[],
  bpm: number,
  style: StyleName,
): Promise<void> {
  await Tone.start()
  cleanup()

  const transport = Tone.getTransport()
  transport.bpm.value = bpm

  const bd = 60 / bpm
  const lastSec = notes.length > 0
    ? Math.max(...notes.map(n => n.startTime + n.duration))
    : 4 * bd
  const loopBars = Math.max(2, Math.ceil(lastSec / (4 * bd)))
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
  const bassEvents = chords.map(c => ({
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
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: -4 }).toDestination()
  synths.push(kick)

  if (style === 'folk') {
    const hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -22,
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
    kick.volume.value = -12
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
      volume: -18,
    }).toDestination()
    const hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.02, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 3000,
      octaves: 1.5,
      volume: -24,
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
      volume: -14,
    }).toDestination()
    const hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -20,
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
    kick.volume.value = -18
    const kRev = new Tone.Reverb({ decay: 4, wet: 0.8 }).toDestination()
    kick.disconnect()
    kick.connect(kRev)
    synths.push(kRev)

    const snare = new Tone.NoiseSynth({
      noise: { type: 'pink' as const },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -24,
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
      volume: -16,
    }).toDestination()
    const hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.025, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 3500,
      octaves: 1.5,
      volume: -26,
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

  activeParts = parts
  activeSynths = synths
  parts.forEach(p => p.start(0))
  transport.start()
}
