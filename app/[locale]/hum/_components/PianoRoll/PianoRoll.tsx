'use client'

import { useEffect, useRef } from 'react'
import { freqToMidi } from '@/lib/music/notes'
import type { RawDetection, QuantizedNote } from '@/lib/music/notes'
import type { MidiNote } from '@/lib/audio/playback'
import styles from './styles.module.css'

const CANVAS_H = 360
const PX_PER_SEC = 120
const PLAYHEAD_X = 0.25

const DEFAULT_ACCENT = '#c8a96e'
const COLOR_GRID = 'rgba(255,255,255,0.05)'
const COLOR_OCTAVE = 'rgba(255,255,255,0.12)'
const COLOR_BG = '#0e0d0c'

type Props = {
  detections: RawDetection[]
  quantized: QuantizedNote[] | null
  isRecording: boolean
  bpm?: number
  accentColor?: string
  humBuffer?: AudioBuffer | null
  midiTrack?: MidiNote[] | null
}

export function PianoRoll({ detections, quantized, isRecording, bpm = 120, accentColor, humBuffer, midiTrack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const scrollSecRef = useRef(0)

  const detectionsRef = useRef(detections)
  const quantizedRef = useRef(quantized)
  const isRecordingRef = useRef(isRecording)
  const bpmRef = useRef(bpm)
  const accentRef = useRef(accentColor ?? DEFAULT_ACCENT)
  const humPeaksRef = useRef<Float32Array | null>(null)
  const midiTrackRef = useRef(midiTrack ?? null)

  useEffect(() => { detectionsRef.current = detections }, [detections])
  useEffect(() => { quantizedRef.current = quantized }, [quantized])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { accentRef.current = accentColor ?? DEFAULT_ACCENT }, [accentColor])
  useEffect(() => { midiTrackRef.current = midiTrack ?? null }, [midiTrack])

  useEffect(() => {
    if (!humBuffer) { humPeaksRef.current = null; return }
    const data = humBuffer.getChannelData(0)
    const numPeaks = Math.ceil(humBuffer.duration * PX_PER_SEC)
    const peaks = new Float32Array(numPeaks)
    const samplesPerPeak = humBuffer.sampleRate / PX_PER_SEC
    for (let i = 0; i < numPeaks; i++) {
      const s0 = Math.floor(i * samplesPerPeak)
      const s1 = Math.min(Math.floor((i + 1) * samplesPerPeak), data.length)
      let peak = 0
      for (let s = s0; s < s1; s++) {
        const v = Math.abs(data[s])
        if (v > peak) peak = v
      }
      peaks[i] = peak
    }
    humPeaksRef.current = peaks
  }, [humBuffer])

  useEffect(() => {
    if (isRecording) scrollSecRef.current = 0
  }, [isRecording])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0) return
      canvas.width = rect.width * dpr
      canvas.height = CANVAS_H * dpr
      const ctx = canvas.getContext('2d')
      ctx?.scale(dpr, dpr)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      if (isRecordingRef.current) return
      e.preventDefault()
      scrollSecRef.current = Math.max(-0.5, scrollSecRef.current + e.deltaX / PX_PER_SEC)
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    function draw() {
      const dets = detectionsRef.current
      const quant = quantizedRef.current
      const midiNotes = midiTrackRef.current
      const recording = isRecordingRef.current
      const currentBpm = bpmRef.current

      const W = canvas!.width / (window.devicePixelRatio || 1)
      const H = CANVAS_H

      // Compute MIDI range from actual note content; fall back to vocal range
      const allMidis: number[] = []
      if (quant && quant.length > 0) {
        for (const n of quant) allMidis.push(n.midi)
      }
      if (midiNotes && midiNotes.length > 0) {
        for (const n of midiNotes) allMidis.push(n.note)
      }
      const effMin = allMidis.length > 0 ? Math.max(0, Math.min(...allMidis) - 4) : 48
      const effMax = allMidis.length > 0 ? Math.min(127, Math.max(...allMidis) + 4) : 84
      const effRange = Math.max(effMax - effMin, 1)
      const rowH = H / effRange
      const toY = (m: number) => (effMax - m) * rowH

      let leftSec: number
      let showPlayhead = false

      if (recording) {
        const lastTime = dets.length > 0 ? dets[dets.length - 1].time : 0
        leftSec = lastTime + 0.05 - (PLAYHEAD_X * W) / PX_PER_SEC
        showPlayhead = true
      } else {
        leftSec = scrollSecRef.current
      }

      const rightSec = leftSec + W / PX_PER_SEC

      if (!ctx2d) return
      ctx2d.fillStyle = COLOR_BG
      ctx2d.fillRect(0, 0, W, H)

      // Semitone & octave grid lines
      for (let midi = effMin; midi <= effMax; midi++) {
        const y = toY(midi)
        ctx2d.strokeStyle = midi % 12 === 0 ? COLOR_OCTAVE : COLOR_GRID
        ctx2d.lineWidth = midi % 12 === 0 ? 1 : 0.5
        ctx2d.beginPath()
        ctx2d.moveTo(0, y)
        ctx2d.lineTo(W, y)
        ctx2d.stroke()
      }

      // Beat grid lines
      const beatDuration = 60 / currentBpm
      const firstBeat = Math.floor(leftSec / beatDuration) * beatDuration
      for (let t = firstBeat; t < rightSec; t += beatDuration) {
        const x = (t - leftSec) * PX_PER_SEC
        ctx2d.strokeStyle = COLOR_OCTAVE
        ctx2d.lineWidth = 0.5
        ctx2d.beginPath()
        ctx2d.moveTo(x, 0)
        ctx2d.lineTo(x, H)
        ctx2d.stroke()
      }

      if (quant && quant.length > 0) {
        for (const note of quant) {
          if (note.startTime + note.duration < leftSec) continue
          if (note.startTime > rightSec) continue
          const x = (note.startTime - leftSec) * PX_PER_SEC
          const w = note.duration * PX_PER_SEC
          const y = toY(note.midi)
          ctx2d.globalAlpha = 0.5 + note.clarity * 0.5
          ctx2d.fillStyle = accentRef.current
          ctx2d.beginPath()
          ctx2d.roundRect(x + 1, y + 1, w - 2, rowH - 2, 3)
          ctx2d.fill()
          ctx2d.globalAlpha = 1
        }
      } else {
        for (const d of dets) {
          if (d.time < leftSec || d.time > rightSec) continue
          const m = freqToMidi(d.freq)
          if (m < effMin || m > effMax) continue
          const x = (d.time - leftSec) * PX_PER_SEC
          const y = toY(m) + rowH / 2
          const r = 3 + d.clarity * 3
          ctx2d.globalAlpha = 0.4 + d.clarity * 0.6
          ctx2d.fillStyle = accentRef.current
          ctx2d.beginPath()
          ctx2d.arc(x, y, r, 0, Math.PI * 2)
          ctx2d.fill()
          ctx2d.globalAlpha = 1
        }
      }

      if (midiNotes && midiNotes.length > 0) {
        const bd = 60 / currentBpm
        for (const note of midiNotes) {
          const startSec = note.beat * bd
          const durSec = note.duration * bd
          if (startSec + durSec < leftSec || startSec > rightSec) continue
          const x = (startSec - leftSec) * PX_PER_SEC
          const w = Math.max(durSec * PX_PER_SEC, 4)
          const y = toY(note.note)
          ctx2d.globalAlpha = 0.85
          ctx2d.fillStyle = accentRef.current
          ctx2d.beginPath()
          ctx2d.roundRect(x + 1, y + 2, w - 2, rowH - 4, 2)
          ctx2d.fill()
          ctx2d.globalAlpha = 0.4
          ctx2d.strokeStyle = accentRef.current
          ctx2d.lineWidth = 1
          ctx2d.stroke()
          ctx2d.globalAlpha = 1
        }
      }

      const humPeaks = humPeaksRef.current
      if (humPeaks) {
        ctx2d.fillStyle = accentRef.current
        ctx2d.globalAlpha = 0.28
        for (let x = 0; x < W; x++) {
          const t = x / PX_PER_SEC + leftSec
          const pi = Math.floor(t * PX_PER_SEC)
          if (pi < 0 || pi >= humPeaks.length) continue
          const barH = Math.max(1, humPeaks[pi] * H * 0.45)
          ctx2d.fillRect(x, H / 2 - barH, 1, barH * 2)
        }
        ctx2d.globalAlpha = 1
      }

      if (showPlayhead) {
        const px = PLAYHEAD_X * W
        ctx2d.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx2d.lineWidth = 1
        ctx2d.beginPath()
        ctx2d.moveTo(px, 0)
        ctx2d.lineTo(px, H)
        ctx2d.stroke()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isVisible = detections.length > 0 || quantized !== null || isRecording || (midiTrack != null && midiTrack.length > 0)

  return (
    <div
      className={styles.wrap}
      style={{ height: isVisible ? CANVAS_H : 0 }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className={`${styles.canvas}${!isRecording && isVisible ? ` ${styles.scrollable}` : ''}`}
        style={{ height: CANVAS_H }}
      />
    </div>
  )
}
