'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChordEvent, Chord } from '@/lib/music/harmonization'
import { chordToName, getDiatonicTriads } from '@/lib/music/harmonization'
import type { KeyResult } from '@/lib/music/key-detection'
import { useStore } from '@/src/store/useStore'
import styles from './styles.module.css'

type Props = {
  chords: ChordEvent[]
  keyResult: KeyResult | null
  onChordsChange: (chords: ChordEvent[]) => void
}

type MarkerPos = { x: number; y: number; chordIdx: number }

function computeCharIndices(text: string, chords: ChordEvent[]): number[] {
  if (!chords.length) return []
  if (!text.length) return chords.map(() => 0)
  const totalBeats = chords.reduce((max, c) => Math.max(max, c.beat + c.duration), 0)
  if (totalBeats === 0) return chords.map((_, i) => Math.floor((i / chords.length) * text.length))
  return chords.map(c => Math.min(Math.floor((c.beat / totalBeats) * text.length), text.length))
}

function buildMirrorHTML(text: string, chords: ChordEvent[]): string {
  const indices = computeCharIndices(text, chords)
  const insertions = chords
    .map((_, i) => ({ charIdx: indices[i], chordIdx: i }))
    .sort((a, b) => a.charIdx - b.charIdx)

  const parts: string[] = []
  let prev = 0
  for (const { charIdx, chordIdx } of insertions) {
    parts.push(
      text.slice(prev, charIdx)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
    )
    parts.push(`<span data-marker="${chordIdx}" style="display:inline-block;width:1px;height:1em;"></span>`)
    prev = charIdx
  }
  parts.push(
    text.slice(prev)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  )
  return parts.join('')
}

export function LyricsEditor({ chords, keyResult, onChordsChange }: Props) {
  const lyrics = useStore(s => s.lyrics)
  const setLyrics = useStore(s => s.setLyrics)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const savedCaretRef = useRef<{ start: number; end: number } | null>(null)

  const [markerPositions, setMarkerPositions] = useState<MarkerPos[]>([])
  const [rhymes, setRhymes] = useState<string[]>([])
  const [rhymeWord, setRhymeWord] = useState('')
  const [rhymePanelOpen, setRhymePanelOpen] = useState(false)
  const [activePopover, setActivePopover] = useState<number | null>(null)

  const repositionMarkers = useCallback(() => {
    const mirror = mirrorRef.current
    const container = containerRef.current
    if (!mirror || !container) return
    const containerRect = container.getBoundingClientRect()
    const positions: MarkerPos[] = []
    mirror.querySelectorAll<HTMLSpanElement>('[data-marker]').forEach(span => {
      const idx = parseInt(span.getAttribute('data-marker') ?? '0', 10)
      const rect = span.getBoundingClientRect()
      positions.push({
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        chordIdx: idx,
      })
    })
    setMarkerPositions(positions)
  }, [])

  useEffect(() => {
    if (!mirrorRef.current) return
    mirrorRef.current.innerHTML = buildMirrorHTML(lyrics, chords)
    requestAnimationFrame(repositionMarkers)
  }, [lyrics, chords, repositionMarkers])

  // Sync textarea height to content
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [lyrics])

  const checkSelection = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    if (s === e) return
    const word = ta.value.slice(s, e).trim()
    if (!/^[a-zA-Z'-]{1,40}$/.test(word)) return
    savedCaretRef.current = { start: s, end: e }
    setRhymeWord(word)
    fetch(`/api/rhymes?word=${encodeURIComponent(word)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { word: string }[]) => {
        const words = data.map((d: { word: string }) => d.word).slice(0, 10)
        if (words.length > 0) {
          setRhymes(words)
          setRhymePanelOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  function insertRhyme(word: string) {
    const ta = textareaRef.current
    if (!ta || !savedCaretRef.current) return
    const { start, end } = savedCaretRef.current
    const val = ta.value
    const newVal = val.slice(0, start) + word + val.slice(end)
    setLyrics(newVal)
    setRhymePanelOpen(false)
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(start + word.length, start + word.length)
    })
  }

  function handleChordSelect(chordIdx: number, newChord: Chord) {
    onChordsChange(chords.map((c, i) => i === chordIdx ? { ...c, chord: newChord } : c))
    setActivePopover(null)
  }

  const diatonicOptions = keyResult ? getDiatonicTriads(keyResult.key, keyResult.mode) : []

  return (
    <div className={styles.wrap}>
      <div className={styles.editorContainer} ref={containerRef}>
        {/* Mirror div — invisible, used to compute marker positions */}
        <div ref={mirrorRef} className={styles.mirror} aria-hidden="true" />

        {/* Chord marker overlay */}
        <div className={styles.markerLayer} aria-hidden="true">
          {markerPositions.map(pos => (
            <div
              key={pos.chordIdx}
              className={styles.markerWrapper}
              style={{ left: pos.x, top: pos.y - 26 }}
            >
              <button
                className={`${styles.chordMarker} ${activePopover === pos.chordIdx ? styles.markerActive : ''}`}
                onClick={() => setActivePopover(activePopover === pos.chordIdx ? null : pos.chordIdx)}
                aria-label={`Chord ${chordToName(chords[pos.chordIdx]?.chord)}`}
                aria-expanded={activePopover === pos.chordIdx}
              >
                {chordToName(chords[pos.chordIdx]?.chord)}
              </button>
              {activePopover === pos.chordIdx && keyResult && (
                <>
                  <div className={styles.popoverBackdrop} onPointerDown={() => setActivePopover(null)} />
                  <ul className={styles.popover} role="listbox" aria-label="select chord">
                    {diatonicOptions.map((chord, i) => {
                      const isActive = chord.root === chords[pos.chordIdx]?.chord.root &&
                        chord.quality === chords[pos.chordIdx]?.chord.quality
                      return (
                        <li
                          key={i}
                          role="option"
                          aria-selected={isActive}
                          className={`${styles.popoverItem} ${isActive ? styles.popoverItemActive : ''}`}
                          onPointerDown={() => handleChordSelect(pos.chordIdx, chord)}
                        >
                          {chordToName(chord)}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={lyrics}
          placeholder="type your lyrics here..."
          onChange={e => setLyrics(e.target.value)}
          onMouseUp={checkSelection}
          onKeyUp={e => {
            if (e.shiftKey) checkSelection()
            if (e.key === 'Escape') setActivePopover(null)
          }}
          aria-label="Lyrics editor"
          rows={6}
          spellCheck
        />
      </div>

      {rhymePanelOpen && rhymes.length > 0 && (
        <div className={styles.rhymePanel}>
          <div className={styles.rhymeHeader}>
            <span className={styles.rhymeLabel}>
              rhymes with <em className={styles.rhymeWord}>{rhymeWord}</em>
            </span>
            <button
              className={styles.closeBtn}
              onClick={() => setRhymePanelOpen(false)}
              aria-label="Close rhyme panel"
            >
              ×
            </button>
          </div>
          <div className={styles.rhymeChips}>
            {rhymes.map(word => (
              <button
                key={word}
                className={styles.chip}
                onClick={() => insertRhyme(word)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
