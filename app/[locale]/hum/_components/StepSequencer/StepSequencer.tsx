'use client'

import { useCallback } from 'react'
import { useStepSequencer } from '@/src/hooks/use-step-sequencer'
import type { StyleName } from '@/lib/audio/playback'
import styles from './styles.module.css'

const ROW_LABELS = ['kick', 'snare', 'hi-hat', 'open']
const GROUPS = [0, 4, 8, 12]

type Props = {
  style: StyleName
  onSwitchToPreset: () => void
}

export function StepSequencer({ style, onSwitchToPreset }: Props) {
  const { grid, toggleCell, cycleVelocity } = useStepSequencer(style)

  const handleClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    if (e.shiftKey) {
      cycleVelocity(row, col)
    } else {
      toggleCell(row, col)
    }
  }, [toggleCell, cycleVelocity])

  const handleContextMenu = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    cycleVelocity(row, col)
  }, [cycleVelocity])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>drum pattern</span>
        <button className={styles.presetBtn} onClick={onSwitchToPreset}>
          use preset
        </button>
      </div>
      <div className={styles.grid} role="grid" aria-label="Step sequencer">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.row} role="row">
            <span className={styles.label} aria-hidden="true">{ROW_LABELS[rowIdx]}</span>
            <div className={styles.cells}>
              {GROUPS.map(groupStart => (
                <div key={groupStart} className={styles.cellGroup}>
                  {[0, 1, 2, 3].map(offset => {
                    const col = groupStart + offset
                    const vel = row[col]
                    return (
                      <button
                        key={col}
                        role="gridcell"
                        className={`${styles.cell} ${vel > 0 ? styles.on : ''}`}
                        style={vel > 0 ? { '--vel-opacity': 0.35 + vel * 0.22 } as React.CSSProperties : undefined}
                        onClick={(e) => handleClick(e, rowIdx, col)}
                        onContextMenu={(e) => handleContextMenu(e, rowIdx, col)}
                        aria-pressed={vel > 0}
                        aria-label={`${ROW_LABELS[rowIdx]} step ${col + 1}${vel > 0 ? `, velocity ${vel}` : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
