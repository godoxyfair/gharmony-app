'use client'

import { useRef, useCallback, useEffect, forwardRef } from 'react'
import { useAudioContext } from '@/src/hooks/use-audio-context'
import { useMicrophoneStream } from '@/src/hooks/use-microphone-stream'
import { cn } from '@/src/utils/helpers'
import styles from './styles.module.css'

const WAVE_RADII = [84, 105, 132] as const

type Props = {
  onRecordStart?: (stream: MediaStream, ctx: AudioContext) => void
  onRecordStop?: () => void
}

export const RecordButton = forwardRef<HTMLButtonElement, Props>(function RecordButton({ onRecordStart, onRecordStop }: Props, ref) {
  const { getContext } = useAudioContext()
  const { status, start, stop } = useMicrophoneStream()

  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number>(0)
  const rmsRef = useRef(0)
  const waveRefs = useRef<(SVGCircleElement | null)[]>([null, null, null])

  const isRecording = status === 'active'
  const isRequesting = status === 'requesting'

  const startWaveLoop = useCallback((analyser: AnalyserNode) => {
    const data = new Float32Array(analyser.fftSize)

    const loop = () => {
      analyser.getFloatTimeDomainData(data)

      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
      const rms = Math.sqrt(sum / data.length)

      rmsRef.current = rmsRef.current * 0.75 + rms * 0.25
      const level = Math.min(rmsRef.current * 10, 1)

      const [w1, w2, w3] = waveRefs.current
      if (w1) {
        w1.setAttribute('r', String(WAVE_RADII[0] * (1 + level * 0.35)))
        w1.style.opacity = String(0.45 + level * 0.35)
      }
      if (w2) {
        w2.setAttribute('r', String(WAVE_RADII[1] * (1 + level * 0.5)))
        w2.style.opacity = String(0.25 + level * 0.25)
      }
      if (w3) {
        w3.setAttribute('r', String(WAVE_RADII[2] * (1 + level * 0.7)))
        w3.style.opacity = String(0.12 + level * 0.15)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    sourceRef.current?.disconnect()
    analyserRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current = null
    rmsRef.current = 0

    waveRefs.current.forEach((w, i) => {
      if (w) {
        w.setAttribute('r', String(WAVE_RADII[i]))
        w.style.opacity = '0'
      }
    })

    stop()
    onRecordStop?.()
  }, [stop, onRecordStop])

  const handleClick = useCallback(async () => {
    if (isRecording) {
      stopRecording()
      return
    }

    const stream = await start()
    if (!stream) return

    const ctx = getContext()
    if (!ctx) return

    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    sourceRef.current = source
    analyserRef.current = analyser

    startWaveLoop(analyser)
    onRecordStart?.(stream, ctx)
  }, [isRecording, stopRecording, start, getContext, startWaveLoop, onRecordStart])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      sourceRef.current?.disconnect()
      analyserRef.current?.disconnect()
    }
  }, [])

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.waves}
        viewBox="0 0 400 400"
        aria-hidden="true"
      >
        {WAVE_RADII.map((r, i) => (
          <circle
            key={i}
            ref={el => { waveRefs.current[i] = el }}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1"
            style={{ opacity: 0 }}
          />
        ))}
      </svg>

      <button
        ref={ref}
        className={cn(styles.btn, isRecording && styles.recording)}
        onClick={handleClick}
        disabled={isRequesting}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? <StopIcon /> : <MicIcon />}
      </button>

      {status === 'denied' && (
        <p className={styles.denied}>
          Microphone access denied — check browser permissions
        </p>
      )}
      {status === 'error' && (
        <p className={styles.denied}>
          Could not access microphone
        </p>
      )}
    </div>
  )
})

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  )
}
