'use client'

import { useCallback } from 'react'
import { useStore } from '@/src/store/useStore'
import { getPresetPattern } from '@/lib/audio/drum-patterns'
import type { StyleName } from '@/lib/audio/playback'

export function useStepSequencer(style: StyleName) {
  const grid = useStore(s => s.stepGrid)
  const setGrid = useStore(s => s.setStepGrid)
  const useCustom = useStore(s => s.useCustomDrum)
  const setUseCustom = useStore(s => s.setUseCustomDrum)

  const toggleCell = useCallback((row: number, col: number) => {
    const next = grid.map(r => [...r])
    next[row][col] = next[row][col] === 0 ? 2 : 0
    setGrid(next)
  }, [grid, setGrid])

  // right-click / shift+click: cycle velocity 1→2→3→1 (turns on if off)
  const cycleVelocity = useCallback((row: number, col: number) => {
    const next = grid.map(r => [...r])
    const cur = next[row][col]
    next[row][col] = cur === 0 ? 1 : cur === 1 ? 2 : cur === 2 ? 3 : 1
    setGrid(next)
  }, [grid, setGrid])

  const switchToCustom = useCallback(() => {
    setGrid(getPresetPattern(style))
    setUseCustom(true)
  }, [style, setGrid, setUseCustom])

  const switchToPreset = useCallback(() => {
    setUseCustom(false)
  }, [setUseCustom])

  return { grid, useCustom, toggleCell, cycleVelocity, switchToCustom, switchToPreset }
}
