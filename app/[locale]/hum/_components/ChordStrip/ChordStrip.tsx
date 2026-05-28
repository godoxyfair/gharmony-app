'use client'

import { useState, useRef, useEffect } from 'react'
import { Reorder } from 'framer-motion'
import type { ChordEvent, Chord } from '@/lib/music/harmonization'
import { chordToName, getDiatonicTriads, harmonicSubstitute } from '@/lib/music/harmonization'
import type { KeyResult } from '@/lib/music/key-detection'
import styles from './styles.module.css'

type Props = {
  chords: ChordEvent[]
  keyResult: KeyResult | null
  activeBeat: number
  onChordsChange: (chords: ChordEvent[]) => void
}

type MenuState = { idx: number; x: number; y: number } | null
type ChordItem = ChordEvent & { _id: number }

let _seq = 0
function withId(c: ChordEvent): ChordItem { return { ...c, _id: _seq++ } }
function strip(items: ChordItem[]): ChordEvent[] {
  return items.map(({ _id: _unused, ...rest }) => rest)
}

export function ChordStrip({ chords, keyResult, activeBeat, onChordsChange }: Props) {
  const [items, setItems] = useState<ChordItem[]>(() => chords.map(withId))
  const [menu, setMenu] = useState<MenuState>(null)
  const isDraggingRef = useRef(false)
  const wasDragRef = useRef(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevChordsRef = useRef(chords)

  useEffect(() => {
    if (chords !== prevChordsRef.current && !isDraggingRef.current) {
      prevChordsRef.current = chords
      setItems(chords.map(withId))
    }
  }, [chords])

  const diatonicOptions = keyResult ? getDiatonicTriads(keyResult.key, keyResult.mode) : []

  function clearLongPress() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function commitDragEnd() {
    isDraggingRef.current = false
    setItems(current => {
      const committed = current.map((item, i) => ({ ...item, beat: i * 4, duration: 4 }))
      onChordsChange(strip(committed))
      return committed
    })
    setTimeout(() => { wasDragRef.current = false }, 50)
  }

  function handleCardClick(idx: number) {
    if (wasDragRef.current || !keyResult) return
    const sub = harmonicSubstitute(items[idx].chord, keyResult.key, keyResult.mode)
    if (!sub) return
    const next = items.map((c, i) => i === idx ? { ...c, chord: sub } : c)
    setItems(next)
    onChordsChange(strip(next))
  }

  function handleContextMenu(e: React.MouseEvent, idx: number) {
    e.preventDefault()
    clearLongPress()
    setMenu({ idx, x: e.clientX, y: e.clientY })
  }

  function handleMenuSelect(chord: Chord) {
    if (menu === null) return
    const { idx } = menu
    setMenu(null)
    const next = items.map((c, i) => i === idx ? { ...c, chord } : c)
    setItems(next)
    onChordsChange(strip(next))
  }

  return (
    <>
      <Reorder.Group
        axis="x"
        values={items}
        onReorder={(newOrder) => {
          isDraggingRef.current = true
          setItems(newOrder)
        }}
        className={styles.strip}
        aria-label="chord progression"
      >
        {items.map((item, i) => {
          const canSub = keyResult !== null && harmonicSubstitute(item.chord, keyResult.key, keyResult.mode) !== null
          return (
            <Reorder.Item
              key={item._id}
              value={item}
              className={`${styles.card} ${item.beat === activeBeat ? styles.active : ''}`}
              whileDrag={{ scale: 1.06, zIndex: 10 }}
              onDragStart={() => {
                wasDragRef.current = true
                isDraggingRef.current = true
                clearLongPress()
              }}
              onDragEnd={commitDragEnd}
              onPointerDown={(e: React.PointerEvent) => {
                wasDragRef.current = false
                clearLongPress()
                longPressTimerRef.current = setTimeout(() => {
                  setMenu({ idx: i, x: e.clientX, y: e.clientY })
                  clearLongPress()
                }, 500)
              }}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onClick={() => handleCardClick(i)}
              onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, i)}
            >
              <span className={styles.chordName}>{chordToName(item.chord)}</span>
              {canSub && <span className={styles.hint} aria-hidden="true">↕</span>}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      {menu !== null && (
        <>
          <div className={styles.menuBackdrop} onPointerDown={() => setMenu(null)} />
          <ul
            className={styles.menu}
            style={{ left: menu.x, top: menu.y }}
            role="listbox"
            aria-label="chord options"
          >
            {diatonicOptions.map((chord, i) => {
              const isActive = chord.root === items[menu.idx]?.chord.root
              return (
                <li
                  key={i}
                  role="option"
                  aria-selected={isActive}
                  className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                  onPointerDown={() => handleMenuSelect(chord)}
                >
                  {chordToName(chord)}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
