'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useVoiceRecorder } from '@/src/hooks/use-voice-recorder'
import { cn } from '@/src/utils/helpers'
import styles from './styles.module.css'

type Props = {
  accentColor: string
  humBuffer: AudioBuffer | null
  humMuted: boolean
  voiceBuffer: AudioBuffer | null
  voiceMuted: boolean
  synthMuted: boolean
  isPlaying: boolean
  onVoiceRecorded: (buf: AudioBuffer) => void
  onToggleHumMute: () => void
  onToggleVoiceMute: () => void
  onToggleSynthMute: () => void
  onDeleteHum: () => void
  onDeleteVoice: () => void
}

export function VoiceTrack({
  accentColor,
  humBuffer,
  humMuted,
  voiceBuffer,
  voiceMuted,
  synthMuted,
  isPlaying,
  onVoiceRecorded,
  onToggleHumMute,
  onToggleVoiceMute,
  onToggleSynthMute,
  onDeleteHum,
  onDeleteVoice,
}: Props) {
  const { state: recState, start, stop, analyserRef } = useVoiceRecorder()
  const voiceCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const isRecording = recState === 'recording'

  const drawStatic = useCallback((canvas: HTMLCanvasElement | null, buf: AudioBuffer, color: string) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = buf.getChannelData(0)
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const step = Math.ceil(data.length / W)
    const mid = H / 2
    ctx.fillStyle = color
    ctx.globalAlpha = 0.55
    for (let x = 0; x < W; x++) {
      const s0 = x * step
      let peak = 0
      for (let i = s0; i < Math.min(s0 + step, data.length); i++) {
        if (Math.abs(data[i]) > peak) peak = Math.abs(data[i])
      }
      const barH = Math.max(1, peak * mid)
      ctx.fillRect(x, mid - barH, 1, barH * 2)
    }
    ctx.globalAlpha = 1
  }, [])

  const startLiveLoop = useCallback(() => {
    const canvas = voiceCanvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new Uint8Array(analyser.fftSize)

    const loop = () => {
      analyser.getByteTimeDomainData(data)
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const step = Math.ceil(data.length / W)
      const mid = H / 2
      ctx.fillStyle = accentColor
      ctx.globalAlpha = 0.7
      for (let x = 0; x < W; x++) {
        const v = (data[x * step] - 128) / 128
        const barH = Math.max(1, Math.abs(v) * mid)
        ctx.fillRect(x, mid - barH, 1, barH * 2)
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [accentColor, analyserRef])

  const stopLiveLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    if (voiceBuffer && !isRecording) {
      drawStatic(voiceCanvasRef.current, voiceBuffer, accentColor)
    }
  }, [voiceBuffer, accentColor, isRecording, drawStatic])

  useEffect(() => {
    if (isRecording) {
      startLiveLoop()
    } else {
      stopLiveLoop()
    }
    return stopLiveLoop
  }, [isRecording, startLiveLoop, stopLiveLoop])

  useEffect(() => () => stopLiveLoop(), [stopLiveLoop])

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      stopLiveLoop()
      const buf = await stop()
      if (buf) {
        onVoiceRecorded(buf)
        drawStatic(voiceCanvasRef.current, buf, accentColor)
      }
    } else {
      const analyser = await start()
      if (analyser) {
        requestAnimationFrame(() => startLiveLoop())
      }
    }
  }, [isRecording, start, stop, stopLiveLoop, startLiveLoop, onVoiceRecorded, drawStatic, accentColor])

  return (
    <div className={styles.tracks}>
      <div className={styles.track}>
        <span className={styles.label}>Synth</span>
        <button
          className={cn(styles.muteBtn, synthMuted && styles.muted)}
          onClick={onToggleSynthMute}
          aria-label={synthMuted ? 'Unmute synth' : 'Mute synth'}
          aria-pressed={synthMuted}
        >
          M
        </button>
        <div className={styles.synthLine} aria-hidden="true" />
      </div>

      {humBuffer && (
        <div className={styles.track}>
          <span className={styles.label}>Hum</span>
          <button
            className={cn(styles.muteBtn, humMuted && styles.muted)}
            onClick={onToggleHumMute}
            aria-label={humMuted ? 'Unmute hum' : 'Mute hum'}
            aria-pressed={humMuted}
          >
            M
          </button>
          <button
            className={styles.deleteBtn}
            onClick={onDeleteHum}
            aria-label="Delete hum track"
          >
            ×
          </button>
          <div className={styles.synthLine} style={{ opacity: 0.1 }} aria-hidden="true" />
        </div>
      )}

      <div className={styles.track}>
        <span className={styles.label}>Voice</span>
        <button
          className={cn(styles.muteBtn, voiceMuted && styles.muted)}
          onClick={onToggleVoiceMute}
          aria-label={voiceMuted ? 'Unmute voice' : 'Mute voice'}
          aria-pressed={voiceMuted}
          disabled={!voiceBuffer}
        >
          M
        </button>
        <button
          className={styles.recBtn}
          style={{ borderColor: isRecording ? '#e05555' : undefined, color: isRecording ? '#e05555' : undefined }}
          onClick={handleRecord}
          aria-label={isRecording ? 'Stop voice recording' : 'Record voice'}
        >
          {isRecording ? <SquareIcon /> : <RecIcon />}
        </button>
        {voiceBuffer && !isRecording && (
          <button
            className={styles.deleteBtn}
            onClick={onDeleteVoice}
            aria-label="Delete voice track"
          >
            ×
          </button>
        )}
        <div className={styles.waveWrap}>
          {!voiceBuffer && !isRecording && (
            <span className={styles.empty}>record voice over the synth</span>
          )}
          <canvas
            ref={voiceCanvasRef}
            className={styles.canvas}
            width={800}
            height={56}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

function RecIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5" fill="currentColor" />
    </svg>
  )
}

function SquareIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  )
}
