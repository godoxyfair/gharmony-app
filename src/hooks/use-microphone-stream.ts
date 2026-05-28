'use client'

import { useState, useCallback, useRef } from 'react'

export type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export function useMicrophoneStream() {
  const [status, setStatus] = useState<MicStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async (): Promise<MediaStream | null> => {
    setStatus('requesting')
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
      setStatus('active')
      return stream
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setStatus('denied')
      } else {
        setStatus('error')
      }
      return null
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStatus('idle')
  }, [])

  return { status, start, stop }
}
