'use client'

import { useCallback } from 'react'

let _ctx: AudioContext | null = null

export function useAudioContext() {
  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!_ctx) {
      _ctx = new AudioContext()
    }
    if (_ctx.state === 'suspended') {
      void _ctx.resume()
    }
    return _ctx
  }, [])

  return { getContext }
}
