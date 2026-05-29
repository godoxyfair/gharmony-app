'use client'

import { useRef, useCallback, useState } from 'react'
import { getContext } from 'tone'

export type VoiceRecorderState = 'idle' | 'recording'

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const start = useCallback(async (): Promise<AnalyserNode | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      })
      streamRef.current = stream

      const rawCtx = getContext().rawContext as AudioContext
      const source = rawCtx.createMediaStreamSource(stream)
      const analyser = rawCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(100)
      recorderRef.current = recorder
      setState('recording')
      return analyser
    } catch {
      return null
    }
  }, [])

  const stop = useCallback((): Promise<AudioBuffer | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) { resolve(null); return }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        analyserRef.current = null
        setState('idle')
        try {
          const arrayBuf = await blob.arrayBuffer()
          const rawCtx = getContext().rawContext as AudioContext
          const audioBuffer = await rawCtx.decodeAudioData(arrayBuf)
          resolve(audioBuffer)
        } catch {
          resolve(null)
        }
      }

      recorder.stop()
      recorderRef.current = null
    })
  }, [])

  return { state, start, stop, analyserRef }
}
