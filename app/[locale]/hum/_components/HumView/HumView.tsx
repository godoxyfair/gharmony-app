'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { getTransport } from 'tone'
import { RecordButton } from '../RecordButton/RecordButton'
import { PianoRoll } from '../PianoRoll/PianoRoll'
import { KeyBadge } from '../KeyBadge/KeyBadge'
import { ChordStrip } from '../ChordStrip/ChordStrip'
import { StyleSelector } from '../StyleSelector/StyleSelector'
import { ProgressionLibrary } from '../ProgressionLibrary/ProgressionLibrary'
import { VoiceTrack } from '../VoiceTrack/VoiceTrack'
import { TapTempo } from '../TapTempo/TapTempo'
import { StepSequencer } from '../StepSequencer/StepSequencer'
import { LaunchpadGrid } from '../LaunchpadGrid/LaunchpadGrid'
import { LyricsEditor } from '../LyricsEditor/LyricsEditor'
import { ExportPanel } from '../ExportPanel'
import { usePitchDetection } from '@/src/hooks/use-pitch-detection'
import { usePlayback } from '@/src/hooks/use-playback'
import { useTapTempo } from '@/src/hooks/use-tap-tempo'
import { quantizeDetections } from '@/lib/music/notes'
import { detectKey, keyToAccentColor } from '@/lib/music/key-detection'
import { harmonize, quantizedToMelody } from '@/lib/music/harmonization'
import type { ChordEvent } from '@/lib/music/harmonization'
import type { RawDetection, QuantizedNote } from '@/lib/music/notes'
import { useStore } from '@/src/store/useStore'
import { useStepSequencer } from '@/src/hooks/use-step-sequencer'
import { cn } from '@/src/utils/helpers'
import styles from './styles.module.css'

export function HumView() {
  const [isRecording, setIsRecording] = useState(false)
  const [detections, setDetections] = useState<RawDetection[]>([])
  const [quantized, setQuantized] = useState<QuantizedNote[] | null>(null)
  const detectionsRef = useRef<RawDetection[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const humRecorderRef = useRef<MediaRecorder | null>(null)
  const humChunksRef = useRef<Blob[]>([])
  const isRecordingRef = useRef(false)

  const { bpm, tap: tapBpm, set: setBpm } = useTapTempo(120)
  const bpmRef = useRef(bpm)
  useEffect(() => { bpmRef.current = bpm }, [bpm])

  const { start: startDetection } = usePitchDetection()
  const {
    play,
    stop: stopPlayback,
    isPlaying,
    style,
    setStyle,
    activeBeat,
    queueChordsUpdate,
    synthMuted,
    toggleSynthMuted,
    voiceMuted,
    toggleVoiceMuted,
    humMuted,
    toggleHumMuted,
    deleteVoice,
    deleteHum,
    midiMuted,
    toggleMidiMuted,
    deleteMidiTrack,
  } = usePlayback()

  const { useCustom: useCustomDrum, switchToCustom, switchToPreset } = useStepSequencer(style)

  const accentColor = useStore(s => s.accentColor)
  const setAccentColor = useStore(s => s.setAccentColor)
  const detectedKey = useStore(s => s.detectedKey)
  const setDetectedKey = useStore(s => s.setDetectedKey)
  const chords = useStore(s => s.chords)
  const setChords = useStore(s => s.setChords)
  const voiceBuffer = useStore(s => s.voiceBuffer)
  const setVoiceBuffer = useStore(s => s.setVoiceBuffer)
  const humBuffer = useStore(s => s.humBuffer)
  const setHumBuffer = useStore(s => s.setHumBuffer)
  const midiTrack = useStore(s => s.midiTrack)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor)
  }, [accentColor])

  useEffect(() => {
    if (isPlaying) {
      getTransport().bpm.value = bpm
    }
  }, [bpm, isPlaying])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isRecordingRef.current) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        tapBpm()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tapBpm])

  const handleRecordStart = useCallback(async (stream: MediaStream, ctx: AudioContext) => {
    stopPlayback()
    ctxRef.current = ctx
    detectionsRef.current = []
    setDetections([])
    setQuantized(null)
    setDetectedKey(null)
    setChords(null)
    setHumBuffer(null)
    setIsRecording(true)

    const t0 = ctx.currentTime

    const cleanup = await startDetection(ctx, stream, (d: RawDetection) => {
      const normalized: RawDetection = { ...d, time: d.time - t0 }
      detectionsRef.current = [...detectionsRef.current, normalized]
      setDetections(prev => [...prev, normalized])
    })

    cleanupRef.current = cleanup ?? null

    humChunksRef.current = []
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) humChunksRef.current.push(e.data) }
      recorder.start()
      humRecorderRef.current = recorder
    } catch {
      humRecorderRef.current = null
    }
  }, [startDetection, stopPlayback, setDetectedKey, setChords, setHumBuffer])

  const handleRecordStop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setIsRecording(false)

    const currentBpm = bpmRef.current
    const notes = quantizeDetections(detectionsRef.current, currentBpm)
    setQuantized(notes)

    const result = detectKey(notes)
    if (result) {
      setDetectedKey(result)
      setAccentColor(keyToAccentColor(result.key, result.mode))
      const melody = quantizedToMelody(notes, currentBpm)
      setChords(harmonize(melody, result.key, result.mode))
    }

    const recorder = humRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      const chunks = humChunksRef.current
      humRecorderRef.current = null
      recorder.addEventListener('stop', async () => {
        if (chunks.length === 0 || !ctxRef.current) return
        try {
          const blob = new Blob(chunks, { type: chunks[0].type })
          const arrayBuf = await blob.arrayBuffer()
          const audioBuf = await ctxRef.current.decodeAudioData(arrayBuf)
          setHumBuffer(audioBuf)
        } catch {}
      }, { once: true })
      recorder.stop()
    }
  }, [setDetectedKey, setAccentColor, setChords, setHumBuffer])

  const handleChordsChange = useCallback((newChords: ChordEvent[]) => {
    setChords(newChords)
    queueChordsUpdate(newChords)
  }, [setChords, queueChordsUpdate])

  const handleKeyOverride = useCallback((key: number, mode: 'major' | 'minor') => {
    const result = { key, mode, confidence: 1 }
    setDetectedKey(result)
    setAccentColor(keyToAccentColor(key, mode))
  }, [setDetectedKey, setAccentColor])

  const handleProgressionLoad = useCallback((newChords: ChordEvent[]) => {
    setChords(newChords)
    queueChordsUpdate(newChords)
  }, [setChords, queueChordsUpdate])

  const handlePlay = useCallback(() => {
    if (!chords) return
    if (isPlaying) {
      stopPlayback()
    } else {
      play(quantized ?? [], chords, bpm)
    }
  }, [quantized, chords, isPlaying, bpm, play, stopPlayback])

  const hasChords = chords !== null && chords.length > 0 && !isRecording

  return (
    <div className={styles.wrap}>
      <RecordButton
        onRecordStart={handleRecordStart}
        onRecordStop={handleRecordStop}
      />
      {detectedKey !== null && (
        <KeyBadge result={detectedKey} onOverride={handleKeyOverride} />
      )}
      {hasChords && (
        <ChordStrip
          chords={chords}
          keyResult={detectedKey}
          activeBeat={activeBeat}
          onChordsChange={handleChordsChange}
        />
      )}
      <ProgressionLibrary
        keyResult={detectedKey}
        onLoad={handleProgressionLoad}
      />
      <PianoRoll
        detections={detections}
        quantized={quantized}
        isRecording={isRecording}
        bpm={bpm}
        accentColor={accentColor}
        humBuffer={humBuffer}
        midiTrack={midiTrack}
      />
      {hasChords && (
        <>
          <VoiceTrack
            accentColor={accentColor}
            humBuffer={humBuffer}
            humMuted={humMuted}
            voiceBuffer={voiceBuffer}
            voiceMuted={voiceMuted}
            synthMuted={synthMuted}
            isPlaying={isPlaying}
            onVoiceRecorded={setVoiceBuffer}
            onToggleHumMute={toggleHumMuted}
            onToggleVoiceMute={toggleVoiceMuted}
            onToggleSynthMute={toggleSynthMuted}
            onDeleteHum={deleteHum}
            onDeleteVoice={deleteVoice}
          />
          <div className={styles.controls}>
            <TapTempo bpm={bpm} onTap={tapBpm} onSet={setBpm} />
            {!useCustomDrum && (
              <>
                <StyleSelector value={style} onChange={setStyle} />
                <button
                  className={styles.customBtn}
                  onClick={switchToCustom}
                  aria-label="Switch to custom drum pattern"
                >
                  custom
                </button>
              </>
            )}
            <button
              className={cn(styles.playBtn, isPlaying && styles.active)}
              onClick={handlePlay}
              aria-label={isPlaying ? 'Stop playback' : 'Play melody'}
            >
              {isPlaying ? <StopIcon /> : <PlayIcon />}
            </button>
          </div>
          <LaunchpadGrid
            bpm={bpm}
            isPlaying={isPlaying}
            accentColor={accentColor}
            midiMuted={midiMuted}
            onToggleMute={toggleMidiMuted}
            onClear={deleteMidiTrack}
          />
          {useCustomDrum && (
            <StepSequencer style={style} onSwitchToPreset={switchToPreset} />
          )}
          <LyricsEditor
            chords={chords}
            keyResult={detectedKey}
            onChordsChange={handleChordsChange}
          />
          <ExportPanel
            notes={quantized ?? []}
            chords={chords}
            bpm={bpm}
            style={style}
            isPlaying={isPlaying}
            onStopPlayback={stopPlayback}
          />
        </>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  )
}
