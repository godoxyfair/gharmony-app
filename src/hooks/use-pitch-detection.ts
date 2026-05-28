'use client'

import { useCallback, useRef } from 'react'
import type { RawDetection } from '@/lib/music/notes'

// Module-level: AudioContext is a singleton, track loaded worklets by context
const loadedContexts = new WeakSet<AudioContext>()

export function usePitchDetection() {
  const nodeRef = useRef<AudioWorkletNode | null>(null)
  const onDetectionRef = useRef<((d: RawDetection) => void) | null>(null)

  const start = useCallback(async (
    ctx: AudioContext,
    stream: MediaStream,
    onDetection: (d: RawDetection) => void,
  ) => {
    onDetectionRef.current = onDetection

    if (!loadedContexts.has(ctx)) {
      await ctx.audioWorklet.addModule('/pitch-processor.js')
      loadedContexts.add(ctx)
    }

    const source = ctx.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ctx, 'pitch-detector')

    node.port.onmessage = (e: MessageEvent<RawDetection>) => {
      onDetectionRef.current?.(e.data)
    }

    source.connect(node)
    nodeRef.current = node

    return () => {
      source.disconnect()
      node.disconnect()
      node.port.onmessage = null
      nodeRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    nodeRef.current?.disconnect()
    nodeRef.current = null
  }, [])

  return { start, stop }
}
