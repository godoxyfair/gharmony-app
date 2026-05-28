'use client'

import { useEffect, useRef } from 'react'
import { freqToMidi } from '@/lib/music/notes'
import type { RawDetection, QuantizedNote } from '@/lib/music/notes'
import styles from './styles.module.css'

// Visible MIDI range: C3 (48) → C6 (84) — full vocal range
const MIDI_MIN = 48
const MIDI_MAX = 84
const MIDI_RANGE = MIDI_MAX - MIDI_MIN

const ROW_H = 10
const CANVAS_H = MIDI_RANGE * ROW_H
const PX_PER_SEC = 120
const PLAYHEAD_X = 0.25

const DEFAULT_ACCENT = '#c8a96e'
const COLOR_GRID = 'rgba(255,255,255,0.05)'
const COLOR_OCTAVE = 'rgba(255,255,255,0.12)'
const COLOR_BG = '#0e0d0c'

function midiToY(midi: number): number {
  return (MIDI_MAX - midi) * ROW_H
}

type Props = {
  detections: RawDetection[]
  quantized: QuantizedNote[] | null
  isRecording: boolean
  bpm?: number
  accentColor?: string
}

export function PianoRoll({ detections, quantized, isRecording, bpm = 120, accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  // left edge of viewport in seconds when not recording; reset to 0 on each new recording
  const scrollSecRef = useRef(0)

  const detectionsRef = useRef(detections)
  const quantizedRef = useRef(quantized)
  const isRecordingRef = useRef(isRecording)
  const bpmRef = useRef(bpm)
  const accentRef = useRef(accentColor ?? DEFAULT_ACCENT)

  useEffect(() => { detectionsRef.current = detections }, [detections])
  useEffect(() => { quantizedRef.current = quantized }, [quantized])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { accentRef.current = accentColor ?? DEFAULT_ACCENT }, [accentColor])

  useEffect(() => {
    if (isRecording) scrollSecRef.current = 0
  }, [isRecording])

  // ResizeObserver so canvas pixel size stays correct if layout shifts after mount
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

  // Horizontal wheel scroll when not recording
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
      const recording = isRecordingRef.current
      const currentBpm = bpmRef.current

      const W = canvas!.width / (window.devicePixelRatio || 1)
      const H = CANVAS_H

      let leftSec: number
      let showPlayhead = false

      if (recording) {
        const lastTime = dets.length > 0 ? dets[dets.length - 1].time : 0
        leftSec = lastTime + 0.05 - (PLAYHEAD_X * W) / PX_PER_SEC
        showPlayhead = true
      } else {
        // static view: scroll from t=0 by default, wheel adjusts scrollSecRef
        leftSec = scrollSecRef.current
      }

      const rightSec = leftSec + W / PX_PER_SEC

      if (!ctx2d) return
      ctx2d.fillStyle = COLOR_BG
      ctx2d.fillRect(0, 0, W, H)

      // Semitone & octave grid lines
      for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
        const y = midiToY(midi)
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
          const y = midiToY(note.midi)
          ctx2d.globalAlpha = 0.5 + note.clarity * 0.5
          ctx2d.fillStyle = accentRef.current
          ctx2d.beginPath()
          ctx2d.roundRect(x + 1, y + 1, w - 2, ROW_H - 2, 3)
          ctx2d.fill()
          ctx2d.globalAlpha = 1
        }
      } else {
        for (const d of dets) {
          if (d.time < leftSec || d.time > rightSec) continue
          const midi = freqToMidi(d.freq)
          if (midi < MIDI_MIN || midi > MIDI_MAX) continue
          const x = (d.time - leftSec) * PX_PER_SEC
          const y = midiToY(midi) + ROW_H / 2
          const r = 3 + d.clarity * 3
          ctx2d.globalAlpha = 0.4 + d.clarity * 0.6
          ctx2d.fillStyle = accentRef.current
          ctx2d.beginPath()
          ctx2d.arc(x, y, r, 0, Math.PI * 2)
          ctx2d.fill()
          ctx2d.globalAlpha = 1
        }
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

  const isVisible = detections.length > 0 || quantized !== null || isRecording

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
