import * as Tone from 'tone'
import type { QuantizedNote } from '@/lib/music/notes'
import type { ChordEvent, Chord } from '@/lib/music/harmonization'
import type { StyleName, MidiNote } from './playback-a'

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

export async function renderOffline(
  notes: QuantizedNote[],
  chords: ChordEvent[],
  bpm: number,
  style: StyleName,
  customDrum?: number[][] | null,
  midiTrack?: MidiNote[] | null,
): Promise<AudioBuffer> {
  const bd = 60 / bpm
  const lastChordBeat = chords.length > 0 ? Math.max(...chords.map(c => c.beat + c.duration)) : 4
  const lastSec = notes.length > 0
    ? Math.max(...notes.map(n => n.startTime + n.duration))
    : lastChordBeat * bd
  const loopBars = Math.max(2, Math.ceil(lastSec / (4 * bd)))
  const totalDuration = loopBars * 4 * bd

  const toneBuffer = await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = bpm

    const chordEvs = chords.map(c => ({
      time: c.beat * bd,
      ns: chordNotes(c.chord, 3),
      dur: c.duration * bd,
    }))

    // ── melody ────────────────────────────────────────────────────────
    const melSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'custom' as const, partials: [1.0, 0.45, 0.22, 0.10, 0.05, 0.025, 0.012, 0.006] },
      envelope: { attack: 0.004, decay: 0.08, sustain: 0.2, release: 0.15 },
      volume: -2,
    })
    if (style === 'cinematic' || style === 'dreampop') {
      const rev = new Tone.Reverb({ decay: style === 'cinematic' ? 3 : 5, wet: style === 'cinematic' ? 0.5 : 0.55 }).toDestination()
      await rev.ready
      melSynth.connect(rev)
    } else if (style === 'lofi') {
      melSynth.connect(new Tone.Filter(3000, 'lowpass').toDestination())
    } else {
      melSynth.toDestination()
    }
    new Tone.Part(
      (time: number, v: { nn: string; dur: number }) => melSynth.triggerAttackRelease(v.nn, v.dur, time),
      notes.map(n => ({ time: n.startTime, nn: nn(n.midi), dur: n.duration }))
    ).start(0)

    // ── chords ────────────────────────────────────────────────────────
    if (style === 'folk') {
      const cSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' as const }, envelope: { attack: 0.06, decay: 0.1, sustain: 0.7, release: 1.2 }, volume: -14 })
      const rev = new Tone.Reverb({ decay: 1.2, wet: 0.2 }).toDestination()
      await rev.ready
      cSynth.connect(rev)
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    } else if (style === 'cinematic') {
      const cSynth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 2, envelope: { attack: 0.5, decay: 0.2, sustain: 0.9, release: 2.0 }, modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }, volume: -16 })
      const rev = new Tone.Reverb({ decay: 4, wet: 0.6 }).toDestination()
      await rev.ready
      cSynth.connect(rev)
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    } else if (style === 'lofi') {
      const cSynth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3, modulationIndex: 8, envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.5 }, modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.3 }, volume: -16 })
      cSynth.connect(new Tone.Filter(2000, 'lowpass').toDestination())
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    } else if (style === 'rock') {
      const cSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' as const }, envelope: { attack: 0.01, decay: 0.08, sustain: 0.85, release: 0.5 }, volume: -18 })
      const cFilter = new Tone.Filter(2200, 'lowpass')
      cFilter.connect(new Tone.Chebyshev(4).toDestination())
      cSynth.connect(cFilter)
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    } else if (style === 'dreampop') {
      const cSynth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 1.5, envelope: { attack: 0.8, decay: 0.2, sustain: 0.9, release: 2.5 }, modulationEnvelope: { attack: 0.8, decay: 0, sustain: 1, release: 1.0 }, volume: -18 })
      const chorus = new Tone.Chorus(4, 2.5, 0.5)
      chorus.start()
      const rev = new Tone.Reverb({ decay: 5, wet: 0.65 }).toDestination()
      await rev.ready
      chorus.connect(rev)
      cSynth.connect(chorus)
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    } else {
      const cSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' as const }, envelope: { attack: 0.04, decay: 0.15, sustain: 0.5, release: 1.0 }, volume: -15 })
      const rev = new Tone.Reverb({ decay: 1.5, wet: 0.25 }).toDestination()
      await rev.ready
      cSynth.connect(rev)
      new Tone.Part((time: number, v: { ns: string[]; dur: number }) => cSynth.triggerAttackRelease(v.ns, v.dur, time), chordEvs).start(0)
    }

    // ── bass ──────────────────────────────────────────────────────────
    const bassOct = (style === 'cinematic' || style === 'dreampop') ? 1 : 2
    const bassAttack = style === 'cinematic' ? 0.4 : style === 'dreampop' ? 0.6 : 0.04
    const bassRelease = style === 'cinematic' ? 1.2 : style === 'dreampop' ? 1.5 : 0.4
    const bassVolume = style === 'cinematic' ? 0 : (style === 'rock' || style === 'dreampop') ? -2 : style === 'indie' ? -6 : -4
    const bassOscType = style === 'rock' ? 'sawtooth' as const : 'sine' as const
    const bSynth = new Tone.MonoSynth({ oscillator: { type: bassOscType }, envelope: { attack: bassAttack, decay: 0.1, sustain: 0.9, release: bassRelease }, volume: bassVolume }).toDestination()
    new Tone.Part(
      (time: number, v: { nn: string; dur: number }) => bSynth.triggerAttackRelease(v.nn, v.dur, time),
      chords.map(c => ({ time: c.beat * bd, nn: nn(c.chord.root + bassOct * 12), dur: (c.duration * 0.5) * bd }))
    ).start(0)

    // ── drums ─────────────────────────────────────────────────────────
    if (customDrum) {
      const stepSecs = bd / 4
      const ckick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: 2 }).toDestination()
      const csnare = new Tone.NoiseSynth({ noise: { type: 'white' as const }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 }, volume: -6 }).toDestination()
      const chat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.025, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -14 }).toDestination()
      chat.frequency.value = 600
      const cohat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.06 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5, volume: -16 }).toDestination()
      cohat.frequency.value = 500

      type CE = { row: number; vel: number }
      const drumEvs: { time: number; row: number; vel: number }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const bs = bar * 4 * bd
        for (let step = 0; step < 16; step++) {
          for (let row = 0; row < 4; row++) {
            const v = customDrum[row]?.[step] ?? 0
            if (v > 0) drumEvs.push({ time: bs + step * stepSecs, row, vel: v })
          }
        }
      }
      new Tone.Part((time: number, ev: CE) => {
        const velocity = ev.vel === 1 ? 0.6 : ev.vel === 2 ? 0.85 : 1.0
        if (ev.row === 0) ckick.triggerAttackRelease('C1', '8n', time, velocity)
        else if (ev.row === 1) csnare.triggerAttackRelease('8n', time, velocity)
        else if (ev.row === 2) chat.triggerAttackRelease('16n', time, velocity)
        else cohat.triggerAttackRelease('8n', time, velocity)
      }, drumEvs).start(0)
    } else {
      const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, volume: 2 }).toDestination()
      if (style === 'folk') {
        const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.04, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -14 }).toDestination()
        hat.frequency.value = 400
        type DE = { t: 'k' | 'h' }
        const evs: { time: number; t: 'k' | 'h' }[] = []
        for (let b = 0; b < loopBars * 4; b++) {
          evs.push({ time: b * bd, t: 'h' })
          if (b % 4 === 0 || b % 4 === 2) evs.push({ time: b * bd, t: 'k' })
        }
        new Tone.Part((time: number, v: DE) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else hat.triggerAttackRelease('16n', time)
        }, evs).start(0)
      } else if (style === 'cinematic') {
        kick.volume.value = -4
        const kRev = new Tone.Reverb({ decay: 3, wet: 0.7 }).toDestination()
        await kRev.ready
        kick.disconnect()
        kick.connect(kRev)
        new Tone.Part(
          (time: number) => kick.triggerAttackRelease('C1', '4n', time),
          Array.from({ length: loopBars }, (_, bar) => ({ time: bar * 4 * bd }))
        ).start(0)
      } else if (style === 'lofi') {
        const snare = new Tone.NoiseSynth({ noise: { type: 'white' as const }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }, volume: -10 }).toDestination()
        const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.02, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5, volume: -16 }).toDestination()
        hat.frequency.value = 600
        const swing = 0.08 * bd
        type LE = { t: 'k' | 's' | 'h' }
        const evs: { time: number; t: 'k' | 's' | 'h' }[] = []
        for (let bar = 0; bar < loopBars; bar++) {
          const bs = bar * 4 * bd
          evs.push({ time: bs, t: 'k' }, { time: bs + 2 * bd, t: 's' })
          for (let e = 0; e < 8; e++) evs.push({ time: bs + e * (bd / 2) + (e % 2 === 1 ? swing : 0), t: 'h' })
        }
        new Tone.Part((time: number, v: LE) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('32n', time)
        }, evs).start(0)
      } else if (style === 'rock') {
        const snare = new Tone.NoiseSynth({ noise: { type: 'white' as const }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 }, volume: -6 }).toDestination()
        const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.03, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -12 }).toDestination()
        hat.frequency.value = 800
        type RE = { t: 'k' | 's' | 'h' }
        const evs: { time: number; t: 'k' | 's' | 'h' }[] = []
        for (let bar = 0; bar < loopBars; bar++) {
          const bs = bar * 4 * bd
          evs.push({ time: bs, t: 'k' }, { time: bs + 2 * bd, t: 'k' }, { time: bs + bd, t: 's' }, { time: bs + 3 * bd, t: 's' })
          for (let e = 0; e < 8; e++) evs.push({ time: bs + e * (bd / 2), t: 'h' })
        }
        new Tone.Part((time: number, v: RE) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('16n', time)
        }, evs).start(0)
      } else if (style === 'dreampop') {
        kick.volume.value = -8
        const kRev = new Tone.Reverb({ decay: 4, wet: 0.8 }).toDestination()
        await kRev.ready
        kick.disconnect()
        kick.connect(kRev)
        const snare = new Tone.NoiseSynth({ noise: { type: 'pink' as const }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }, volume: -14 })
        const sRev = new Tone.Reverb({ decay: 3, wet: 0.7 }).toDestination()
        await sRev.ready
        snare.connect(sRev)
        type DP = { t: 'k' | 's' }
        const evs: { time: number; t: 'k' | 's' }[] = []
        for (let bar = 0; bar < loopBars; bar++) {
          const bs = bar * 4 * bd
          evs.push({ time: bs, t: 'k' }, { time: bs + 2 * bd, t: 's' })
        }
        new Tone.Part((time: number, v: DP) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '4n', time)
          else snare.triggerAttackRelease('4n', time)
        }, evs).start(0)
      } else {
        // indie
        const snare = new Tone.NoiseSynth({ noise: { type: 'white' as const }, envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.04 }, volume: -8 }).toDestination()
        const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.025, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3500, octaves: 1.5, volume: -18 }).toDestination()
        hat.frequency.value = 700
        type IE = { t: 'k' | 's' | 'h' }
        const evs: { time: number; t: 'k' | 's' | 'h' }[] = []
        for (let bar = 0; bar < loopBars; bar++) {
          const bs = bar * 4 * bd
          evs.push({ time: bs, t: 'k' }, { time: bs + 1.5 * bd, t: 'k' }, { time: bs + bd, t: 's' }, { time: bs + 3 * bd, t: 's' })
          for (let e = 0; e < 8; e++) evs.push({ time: bs + e * (bd / 2), t: 'h' })
        }
        new Tone.Part((time: number, v: IE) => {
          if (v.t === 'k') kick.triggerAttackRelease('C1', '8n', time)
          else if (v.t === 's') snare.triggerAttackRelease('8n', time)
          else hat.triggerAttackRelease('16n', time)
        }, evs).start(0)
      }
    }

    // ── midi track ────────────────────────────────────────────────────
    if (midiTrack && midiTrack.length > 0) {
      const pianoSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' as const },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 1.5 },
        volume: -4,
      }).toDestination()
      const midiEvs: { time: number; nn: string; dur: number }[] = []
      for (let bar = 0; bar < loopBars; bar++) {
        const barStart = bar * 4 * bd
        for (const note of midiTrack) {
          midiEvs.push({ time: barStart + note.beat * bd, nn: nn(note.note), dur: Math.max(note.duration * bd, 0.05) })
        }
      }
      new Tone.Part(
        (time: number, v: { nn: string; dur: number }) => pianoSynth.triggerAttackRelease(v.nn, v.dur, time),
        midiEvs,
      ).start(0)
    }

    transport.start(0)
  }, totalDuration, 2, 44100)

  return toneBuffer.get()!
}
