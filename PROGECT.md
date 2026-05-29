# Worldsong — Project Brief

## Context

This is a portfolio demo project built to apply for a **Design Engineer** role at **vvd** (vvd.studio), a startup making tools for storytellers, worldbuilders, and writers. Their philosophy: use AI to **empower** human creativity, not replace it. They specifically dislike "AI slop" generators.

The applicant is a vocalist and guitarist, so the project leans into music as the creative input. The goal is to ship a polished, working demo that demonstrates: end-to-end ownership, design taste, motion/polish, real frontend craft, and thoughtful use of AI.

## How to use this document

This file defines **what** to build and **why** — product vision, design principles, feature scope, definition of done.

For **how** to build it — folder layout, naming conventions, state management patterns, testing rules, dependency choices — refer to `ARCHITECTURE.md` in the project root. Read both files before starting any feature. If the two conflict, `PROJECT_BRIEF.md` wins on product and design decisions; `ARCHITECTURE.md` wins on code structure and conventions.

---

## Product concept

**Worldsong** — a browser-based tool where music creates worlds.

Two integrated modes that flow into each other:

### Mode 1 — Hum
The user hums or sings a short melody into the microphone. The app:
- Detects pitch in real time and shows the melody as notes on a piano-roll-style canvas
- Quantizes the melody to a key and rhythm
- Generates harmony (chord progression) from the melody using music theory rules — **not AI**
- Plays back the melody together with a generated accompaniment (drums + chords + bass) in a chosen style (folk / cinematic / lo-fi)
- Lets the user edit chords, change style, and continue to Mode 2

### Mode 2 — World
The user's composition (or live audio input) drives a **real-time generative world**. As the music plays:
- A 3D scene reacts to the audio: fog density, light color, particle behavior, terrain, sky — all driven by audio features (loudness, brightness, key, tempo, harmonic content)
- A short **literary fragment** (2–3 sentences) is generated alongside the world via the Gemini API — a sensory glimpse of a place where this music might exist
- The user can save the result as a "world card" (screenshot + audio snippet + text fragment) to share

The flow tells a complete story: **note → composition → world**. This rhymes precisely with vvd's mission: "empower people to create worlds, stories, and experiences that others can get lost in."

---

## Design principles

These are non-negotiable. The whole point of this project is to demonstrate design engineering taste.

1. **Tool, not toy.** Worldsong is a serious creative instrument. Avoid playful illustration, cartoon animations, or "fun" microcopy. Think Ableton, Linear, Arc, Figma — not Duolingo.

2. **AI augments, never authors.** The melody is the user's. The harmony is generated from their notes using deterministic music theory. The world is rendered from their audio. The **only** place an LLM is used is one literary fragment in World mode — a spark, not a replacement.

3. **Craft over chrome.** No glassmorphism, no gradient buttons, no generic shadcn defaults. Typography, spacing, and motion do the heavy lifting. Every animation has a reason.

4. **It must feel instant.** Audio-driven UI cannot have latency. Pitch detection, visual reactions, harmonic generation — all happen in <50ms. The Gemini call is the only async operation, and it streams.

5. **Dark by default.** Worldsong is an evening tool — you sit with it, you focus, you create. Light mode is not needed for the demo.

6. **Accessibility matters.** Visible focus states, keyboard navigation for all controls, semantic HTML, sensible aria labels, prefers-reduced-motion respected. The vvd job posting explicitly lists accessibility as a plus.

---

## Visual direction

### Typography
- **Display / headings:** Instrument Serif or Fraunces (variable, expressive serif). Used sparingly and large.
- **UI / body:** Inter or Geist. Tight letter-spacing on headings (-0.02em), loose on body.
- **Mono (for technical readouts like BPM, key, note names):** Geist Mono or JetBrains Mono.

### Color
Tight, restrained palette. No more than 5 colors total in the whole app.
- Background: very dark, slightly warm — around `#0e0d0c` or `#101010`
- Foreground: warm off-white — around `#f5f1ea`
- Muted: `#6b6660` ish
- Accent: a single chromatic accent that shifts based on the current musical key (e.g. C major → warm gold, A minor → cool indigo). This is the "magic" — the UI tints itself with the user's music.

### Motion
- All transitions use ease-out cubic-bezier(0.16, 1, 0.3, 1) or similar — never bouncy, never linear.
- Durations: 150ms for micro-interactions, 400ms for layout changes, 1200ms+ for atmospheric scene shifts.
- Page transitions between Hum and World modes are slow, almost cinematic — the user is being transported.
- Audio-reactive elements respond on the same frame as the audio. No setTimeout, only requestAnimationFrame + AnalyserNode.

### Layout
- Generous whitespace. Heading "Worldsong" can take a third of the screen on landing.
- Centered, single-column for focus mode. The user is doing one thing — making music.
- No traditional nav bar in Hum or World mode. Quiet controls in corners that fade in on hover/idle.

---

## Feature roadmap

The project is broken into independent features. Each one ships to Vercel before moving on. Features have prerequisites (listed under `Depends on`) but otherwise can be reordered or iterated on as needed.

> **Before implementing any feature:** re-read `ARCHITECTURE.md`. Folder paths, naming, and patterns mentioned in feature scopes below are illustrative — defer to `ARCHITECTURE.md` if it specifies otherwise.

---

### Feature 01 — Foundation & design system
**Depends on:** nothing.

The skeleton everything else builds on. Without a strong design system, every later feature will look generic.

**Scope:**
- Next.js 15 project with App Router, TypeScript strict, Tailwind v4
- Design tokens centralized in `/lib/design/tokens.ts`: colors, type scale, spacing, motion easings, durations
- Fonts loaded via `next/font`: Instrument Serif (display), Inter (UI), Geist Mono (technical readouts)
- Global CSS reset, baseline typography styles
- Primitives in `/components/ui/`: Button, IconButton, Slider, Tooltip — minimal, no shadcn
- Vercel deployment configured, `GEMINI_API_KEY` env var set

**Done when:**
- Visiting the deployed URL renders an empty page with global styles applied
- Importing tokens from `@/lib/design/tokens` works in any component
- Primitives are documented in a single playground page (e.g. `/dev/playground`) — not linked in the final UI

---

### Feature 02 — Landing page
**Depends on:** 01.

The first impression. This is what the vvd team sees in the first 5 seconds. It has to be beautiful on its own, before any functionality is shown.

**Scope:**
- Full-screen, dark, with the word "Worldsong" in Instrument Serif at huge size
- One-line manifesto below ("Music is the prompt." or similar — needs writing)
- Single primary affordance: "begin" or "enter" → routes to `/hum`
- Subtle motion on load: text fade-up with stagger, no bounce
- Responsive: mobile keeps the layout, just scales down
- Meta tags: title, description, OG image, favicon

**Done when:**
- The landing page could ship as a standalone "coming soon" page and look intentional
- Lighthouse Performance ≥ 95 on this page

---

### Feature 03 — Microphone & audio capture
**Depends on:** 01.

The plumbing for everything audio-related. Get this rock-solid before building UI on top.

**Scope:**
- Microphone permission flow with a thoughtful empty state and an error state (user denied / no device)
- `useAudioContext` hook — singleton AudioContext, lazy-initialized on first user interaction (browser requirement)
- `useMicrophoneStream` hook — returns the MediaStream + cleanup
- AudioWorklet setup: a worklet processor that pipes audio buffers to the main thread (foundation for pitch detection)
- Input level meter component (used in Hum mode and settings)
- Input device picker (read from `navigator.mediaDevices.enumerateDevices()`)

**Done when:**
- A dev page (`/dev/audio`) shows live input level from the mic
- Switching input devices works without page reload
- Permission denial shows a useful message, not a browser error

---

### Feature 04 — Pitch detection & piano roll
**Depends on:** 03.

The core of Hum mode. The user sings, the app understands.

**Scope:**
- `pitchy` library integrated into an AudioWorklet (NOT main thread — performance and design-engineering signal)
- `usePitchDetection` hook — returns a stream of `{ freq, clarity, time }` events
- Frequency → MIDI note conversion in `/lib/music/notes.ts`
- Piano-roll canvas component:
  - Horizontal scrolling timeline, current playhead in the center
  - Detected pitches rendered as rounded rectangles, color tinted by clarity
  - Grid lines for octaves and beats
  - 60fps via requestAnimationFrame
- "Stop singing" → quantization step:
  - Round each detected pitch to nearest semitone
  - Snap onsets to nearest 1/8 or 1/16 grid
  - Merge consecutive same-pitch detections into single notes

**Done when:**
- User can sing into the mic and see notes appear in real time
- After stopping, the melody is quantized and rendered as clean rectangles
- Visual feels responsive — no perceptible latency between voice and screen

---

### Feature 05 — Key detection
**Depends on:** 04.

Figure out what key the user sang in. This unlocks harmonization.

**Scope:**
- `/lib/music/key-detection.ts` — Krumhansl-Schmuckler algorithm
- Build chroma vector from quantized melody (12-dim, weighted by note duration)
- Correlate against 24 K-K profiles (12 major + 12 minor)
- Return `{ key: 0-11, mode: 'major' | 'minor', confidence: 0-1 }`
- Display detected key in the UI (e.g. "A minor" in mono typeface near the piano roll)
- Manual override: user can click and pick a different key

**Done when:**
- For test melodies in known keys, detection works ≥ 90% of the time
- Detected key is shown in the UI and can be overridden

---

### Feature 06 — Harmonization engine
**Depends on:** 05.

Generate a chord progression that fits the melody. Pure music theory, zero AI.

**Scope:**
- `/lib/music/harmonization.ts`
- Input: melody (array of `{ midi, beat, duration }`), key, mode
- Output: chord progression (array of `{ chord, beat, duration }`)
- Algorithm:
  - For each bar, find the dominant melody pitch (longest or on strong beat)
  - Pick the diatonic triad whose root or third or fifth matches
  - Apply constraints: tonic on bar 1, tonic or dominant on final bar, no more than 2 bars of the same chord
  - Prefer common progressions (I-V-vi-IV, vi-IV-I-V) if algorithm produces something awkward
- Fallback library: 8 hand-curated progressions for major and minor
- Chord representation: `{ root: 0-11, quality: 'maj'|'min'|'dim'|'maj7'|'min7'|'dom7', inversion: 0-2 }`

**Done when:**
- Any input melody produces a progression that sounds musical when played underneath it
- Output is deterministic — same input → same output (important for the user-edit feature later)

---

### Feature 07 — Playback engine
**Depends on:** 06.

The user hears their composition with a band behind it.

**Scope:**
- `/lib/audio/playback.ts` wrapping Tone.js
- Tone.Transport setup, BPM derived from melody timing or set manually
- Six style presets, each declaratively defined:
  ```ts
  type Style = {
    name: 'folk' | 'cinematic' | 'lofi' | 'rock' | 'dreampop' | 'indie';
    drums: () => Tone.Sequence;
    chords: () => Tone.PolySynth;
    bass: () => Tone.MonoSynth;
    pattern: RhythmTemplate;
  };
  ```
- Folk: triangle PolySynth chords, brush kick on 1 & 3, soft hat on every beat
- Cinematic: AMSynth pad with long reverb, sub-bass, kick only on bar downbeats
- Lo-fi: FMSynth chords through low-pass filter, swung 8th hats, snare on 3
- Rock: sawtooth PolySynth + Chebyshev distortion, kick on 1 & 3, snare on 2 & 4, straight 8th hats; sawtooth bass; melody through waveshaper
- Dream pop: AMSynth pad with chorus + long reverb, sparse kick and reverb-drenched snare, sub-octave sine bass with slow attack; melody through wide reverb
- Indie: clean triangle PolySynth with light room reverb, kick on 1 and and-of-2, snare on 2 & 4, 8th hats
- Play/stop/loop transport controls
- Render the user's quantized melody back through a vocal-friendly sampler (or as MIDI on a soft synth if vocal sample is unavailable)

**Done when:**
- Pressing play produces a coherent musical performance: melody + chords + drums + bass
- Switching styles mid-playback updates instruments without restarting
- No audio glitches or clicks on style switches

---

### Feature 08 — Chord editing
**Depends on:** 07.

Let the user mess with the harmony. Real instrument-like interactivity.

**Scope:**
- Chords rendered above the piano roll as small interactive cards
- Click → cycles through harmonic substitutes (IV ↔ ii, V ↔ vii°, I ↔ vi)
- Drag to reorder (Framer Motion `Reorder`)
- Long-press or right-click → menu with all diatonic options
- Changes apply on the next loop iteration, not mid-bar
- Visual: subtle highlight on the currently-playing chord

**Done when:**
- Editing a chord updates playback without restart
- Chord changes feel "professional" — like a DAW, not a toy

---

### Feature 09 — Chord progression library
**Depends on:** 08.

Quick-start library of common progressions. User picks a template instead of singing — gets a working harmony in one tap.

**Scope:**
- `/lib/music/progressions.ts` — catalog of named progressions as arrays of `{ degree, quality }`:
  - Pop: I–V–vi–IV
  - Jazz: ii–V–I
  - Blues: I–IV–I–V–IV–I (12-bar)
  - Andalusian: i–VII–VI–V
  - Pachelbel: I–V–vi–iii–IV–I–IV–V
  - Minor ballad: i–VI–III–VII
  - At least 12 total, covering major + minor
- `/hum/_components/ProgressionLibrary/` — compact panel (collapsible, doesn't obstruct piano roll)
  - Cards grid: progression name + preview of chord symbols
  - Click → loads progression into chord strip, overwrites current chords
  - Adapts selected progression to detected/set key
- No random generation — library is curated and deterministic
- Keyboard: arrow keys navigate cards, Enter loads

**Done when:**
- User without a mic can open the app, pick a progression, hit play, and hear music
- Loaded progression sounds correct in the active key
- Panel opens/closes without layout shift

---

### Feature 9.5 — Voice overdub track
**Depends on:** 07.

A voice recording layer on top of the synthesized backing track. User records their voice while the synth plays, then both tracks play together with independent mute controls.

**Scope:**
- `useVoiceRecorder` hook — `MediaRecorder` captures mic audio, decodes into `AudioBuffer` via Tone.js AudioContext for guaranteed sync
- Synth routing: all synths route through `Tone.Destination`. Mute via `Tone.getDestination().mute`
- Voice routing: `Tone.Player` → `Tone.Volume` → raw `AudioContext.destination` (bypasses Tone.Destination for independent muting)
- `player.sync().start(0)` — perfect sync with `Tone.Transport`; voice starts exactly when transport starts
- Track panel (shown after chords exist): two rows — Synth row (M mute button, stylized indicator) + Voice row (M mute, record button, waveform canvas)
- Waveform canvas: live animated bars during recording (AnalyserNode RAF loop); static peaks after recording (downsampled `AudioBuffer.getChannelData(0)`)
- Voice buffer and mute state stored in Zustand — persists across style changes and progression edits
- Pressing "record voice" auto-starts synth playback if not already playing

**Done when:**
- User can record voice, hear it play back in sync with synth
- Muting either track silences only that track
- Waveform animates live during recording, shows static shape after
- Re-recording replaces the previous voice take

---

### Feature 10 — Tap tempo
**Depends on:** 07.

Manual BPM setting via tapping. Essential for musicians who know their tempo before singing.

**Scope:**
- `useTapTempo` hook in `src/hooks/use-tap-tempo.ts`
  - Records timestamp of each tap
  - Computes running average of intervals over last 4 taps
  - Outputs BPM clamped to [40, 240]
  - Resets if gap > 3s
- Tap button in Hum mode transport bar (next to BPM readout in Geist Mono)
- BPM readout becomes editable text field — direct number input with validation
- BPM change updates `Tone.Transport.bpm` immediately without stopping playback
- Keyboard shortcut: `T` while not recording

**Done when:**
- Tapping 4× sets BPM accurately (±2 BPM)
- Direct text entry accepts values 40–240, rejects outside range without error toast
- Playback speed changes audibly on next beat

---

### Feature 11 — Step sequencer
**Depends on:** 07.

User draws their own drum pattern. Replaces preset selection for users who want control.

**Scope:**
- `/hum/_components/StepSequencer/` — 16-step grid, 4 rows (kick, snare, hi-hat, open hat)
- Each cell: toggle on/off on click, subtle active state
- Grid always 16 steps; tempo from `Tone.Transport`
- `useStepSequencer` hook drives a `Tone.Sequence` — reads grid state each step
- Velocity: right-click or shift-click → cycles through 3 levels (soft / medium / hard), visualized by cell opacity
- Presets toggle: "Use preset" / "Custom" switch — custom shows sequencer grid, preset shows StyleSelector
- Pattern persists in Zustand store across playback stops
- Import from style preset: switching from preset → custom pre-fills grid with that style's default pattern

**Done when:**
- Drawing a pattern and pressing play produces exactly that drum pattern
- Switching between preset and custom does not lose the custom pattern
- Grid is readable at a glance — 16 cells fit in the UI without horizontal scroll on 1280px viewport

---

### Feature 11.5 — Virtual Launchpad (on-screen MIDI keyboard)
**Depends on:** 07.

On-screen 8×8 chromatic note grid styled after Novation Launchpad. User plays notes live; with recording enabled, notes are captured into a looping MIDI piano track layered over the existing arrangement.

**Scope:**
- `LaunchpadGrid` component — 8×8 button grid, chromatic layout (C2–D#7), black-key visual distinction, C-note markers
- Touch/pointer events with `setPointerCapture` for fluid sliding across pads
- **Live playback:** pressing a pad triggers immediate `PolySynth` (triangle wave, pluck-like ADSR) via a `Volume` bus independent of `Tone.getDestination()` — unaffected by synth global mute
- **Recording mode:** "rec" button toggles recording; while recording + playing, each note-on/off is timestamped relative to the loop position (`Transport.seconds * bpm / 60 % loopLengthBeats`) and stored as `{ note, beat, duration }` in Zustand `midiTrack[]`
- **Recorded-note overlay:** pads that appear in `midiTrack` show an accent-tinted border/background; recording mode adds a pulsing red frame around the whole grid
- **Loop playback:** `midiTrack` is passed to `playA` alongside `customDrum`; a `Tone.Part` schedules note events for each bar of the loop on a separate `pianoBus → rawContext.destination` chain
- **Mute / clear:** M button mutes both live and scheduled piano buses; "clear" removes all recorded notes; state persists in Zustand across style changes
- `loopLengthBeats` stored in Zustand, set by `usePlayback.play()` so the hook can compute beat-within-loop without prop drilling

**Done when:**
- Pressing pads produces sound immediately with no perceptible latency
- Notes recorded in rec+play mode loop back on next iteration alongside chords and drums
- Recorded notes are visually marked on the grid; recording state is clearly indicated
- Mute silences only the piano layer, not drums or chords

---

### Feature 12 — Lyrics editor with chords
**Depends on:** 08.

Text editor where chords float above the words they land on. Bridges melody → meaning — exactly the vvd worldbuilding narrative.

**Scope:**
- `/hum/_components/LyricsEditor/` — textarea-like component (contentEditable div)
- Chord markers rendered inline above the caret position where each chord change falls
  - Markers update position as user types (reflow-aware)
  - Click marker → chord edit popover (same as Feature 08 chord cards)
- Rhyme assistant panel (collapsible, right side):
  - On word highlight → fetch `/api/rhymes?word=X` which calls Datamuse API (free, no key)
  - Returns up to 10 rhyme suggestions, displayed as small chips
  - Click chip → inserts word at caret
- Auto-save: lyrics stored in Zustand store, persists across feature navigation
- Export: lyrics included in exports (Feature 13) as plain text with chord annotations above lines

**Architecture notes:**
- API route `/app/api/rhymes/route.ts` — server-side Datamuse proxy (avoid CORS, keep client clean)
- Validate `word` param with Zod before forwarding: `/^[a-zA-Z'-]{1,40}$/`
- Return generic error to client; log details server-side via `Log.error`

**Done when:**
- User can type lyrics and see chord symbols float above the correct syllables
- Rhyme suggestions appear within 500ms of highlighting a word
- Lyrics survive switching to progression library and back

---

### Feature 13 — MIDI & WAV export
**Depends on:** 07, 12.

Take the composition out of the browser. A serious musician's expectation.

**Scope:**
- Export panel in Hum mode — three download actions:
  1. **MIDI** — melody track + chord track as `.mid` file
     - Pure browser: build MIDI binary (`ArrayBuffer`) in `/lib/export/midi.ts` using raw MIDI spec (no library — small enough to implement manually for melody + chords)
     - Chord track: one note-on/off per chord root per bar, velocity 80
     - Tempo event from Tone.Transport.bpm
  2. **WAV** — full mix rendered offline
     - `OfflineAudioContext` at 44100 Hz, render exactly N bars via Tone.js offline render
     - Float32 → 16-bit PCM → WAV header in `/lib/export/wav.ts`
     - Download via `URL.createObjectURL`
  3. **Chord sheet (TXT)** — plain text: `| Am | F | C | G |` per bar, with lyrics lines interleaved if lyrics exist
- All exports are client-side — no backend, no upload
- Progress indicator for WAV render (can take 2–5s): simple text "Rendering…" in the button

**Done when:**
- MIDI file opens correctly in GarageBand / Logic / Ableton — notes and chords land on correct beats
- WAV file plays back the same as in-browser playback
- Chord sheet is readable as a real lead sheet

---

### Feature 14 — World mode scene
**Depends on:** 01 (can be developed in parallel with Hum mode features).

The 3D world that reacts to music. Build this so it looks beautiful even with no audio input.
Make this world in form like a 3D cube in the top right side of hum page. User can rotate it with cursore. Visual effects inside this cube.

**Scope:**
- react-three-fiber scene at `/world`
- Components:
  - Low-poly terrain plane with displacement map
  - Volumetric fog (use drei's `<Fog>` or custom shader)
  - Hemisphere of particles (use drei's `<Points>`)
  - Dynamic three-point lighting
  - Slow camera dolly for passive motion during silence
- Performance budget: 50+ FPS on mid-tier laptop
- Suspense fallback while assets load — a quiet text fade-in, no spinner

**Done when:**
- Visiting `/world` shows a beautiful static-looking scene with subtle ambient motion
- A screenshot of the scene at any moment is portfolio-worthy

---

### Feature 15 — Audio-reactive world
**Depends on:** 07, 14.

Connect the music to the visuals. This is where the magic happens.

**Scope:**
- AnalyserNode tapped from Tone.Destination
- Extract per-frame:
  - RMS (loudness) → particle motion intensity, fog density
  - Spectral centroid (brightness) → light hue (warm ↔ cool), sky tint
  - Tempo (Tone.Transport.bpm) → camera drift speed, particle flow rate
  - Currently-playing chord root (passed from playback engine via Zustand) → accent color of key light
- Smooth all driving values with exponential moving averages — no jitter
- Map functions live in `/lib/world/mappings.ts` for tweakability

**Done when:**
- Audio changes are visible in the scene within 1 frame
- Sustained silence → scene returns to ambient state smoothly, never frozen
- The mapping feels intentional, not random — minor key clearly looks different from major

---

### Feature 16 — Narrative generation
**Depends on:** 15.

The one place AI is used. A short literary fragment that gives the world a sense of place.

**Scope:**
- API route `/app/api/narrative/route.ts`
- Accepts JSON: `{ key, mode, tempo, dynamics, texture, instruments }`
- Calls Gemini 2.5 Flash via `@google/generative-ai`
- Prompt (full spec below) requests 2-3 sentences, no clichés, sensory and specific
- Streams response back as chunked plain text
- Frontend: typewriter-style reveal in lower-left of World scene
- Static fallback: if API fails or daily quota hit, return a procedurally-assembled fragment from a pool of pre-written ones
- Rate limiting: in-memory counter, max 1400 requests/day (buffer below Gemini's 1500 limit)

**Gemini prompt:**
```ts
const prompt = `You write single-paragraph atmosphere fragments for a music-driven worldbuilding tool.

The user just played music with these characteristics:
- Key: ${key} ${mode}
- Tempo: ${tempo} BPM
- Texture: ${texture}
- Dynamics: ${dynamics}
- Instruments suggesting: ${instrumentHint}

Write 2 or 3 sentences describing a place where this music exists.

Requirements:
- Sensory, specific, concrete. Mention exactly one of: light quality, weather, ground texture, distant sound, smell.
- Literary register. Le Guin, Tove Jansson, Studio Ghibli. NOT high-fantasy or RPG flavor text.
- No characters, no actions, no plot. Just place.
- Forbidden words: whispers, ancient, ethereal, mystical, shadows dance, time stands still.
- 40-60 words total. No title, no quotes, just the paragraph.`;
```

**Done when:**
- Narrative appears within ~2 seconds of entering World mode
- Streaming reveals text character-by-character at a readable pace
- Failed API call shows a fallback without breaking the experience

---

### Feature 17 — Mode transitions
**Depends on:** 02, 07, 14.

Tie Hum and World together. The flow from melody → world should feel cinematic.

**Scope:**
- "Continue to world" affordance at the bottom of Hum mode after a melody is composed
- Composition state passed via Zustand store (not URL state — too much data)
- Transition animation: Hum UI fades to black, then world fades in from black, ~1.2s total
- World plays the composition automatically on load
- "Back to hum" affordance in World mode, transitions in reverse

**Done when:**
- Full flow Hum → World → Hum works without page reloads
- Transition feels intentional, not jarring

---

### Feature 18 — Save & share
**Depends on:** 16, 17.

The user wants to keep what they made. This also gives a viral mechanism to think about.

**Scope:**
- "Save world" button in World mode
- Generates a "world card": a 1200x630 PNG with the scene screenshot, the narrative text, and the musical metadata (key, tempo, style)
- Use `html-to-image` or canvas-based composition
- Download as PNG locally — no backend storage for the demo
- Optional: copy a shareable URL with composition state encoded in URL params (small enough to fit)

**Done when:**
- User can download a beautiful, OG-image-quality PNG of their world
- The PNG looks good when shared on Twitter / Slack previews

---

### Feature 19 — Accessibility & polish pass
**Depends on:** everything else, done last.

The make-or-break pass

**Scope:**
- Every interactive element has a visible focus state (custom, not browser default)
- Keyboard navigation works through the full flow
- Keyboard shortcuts: space (play/stop), R (record), T (tap tempo), Esc (cancel), Tab/Shift+Tab (move focus)
- All controls have aria-labels where text isn't visible
- `prefers-reduced-motion` respected: no camera dolly, particle motion stilled, fades replaced with cuts
- Color contrast ≥ AAA for body text, ≥ AA for UI elements
- Screen reader test: walk through the app with VoiceOver or NVDA
- Mobile sanity check: Safari iOS, Chrome Android — at minimum the landing and World mode load and play

**Done when:**
- Lighthouse Accessibility ≥ 95
- Full keyboard navigation possible
- Reduced-motion users get a calm, non-animated experience that still feels intentional

---

### Feature 20 — Case study & demo video
**Depends on:** the project being feature-complete.

The pitch wrapped around the work. Without this, the project is just code; with it, it's an application.

**Scope:**
- `/about` page (or section in the landing) — short case study:
  - Problem: what tool was missing
  - Approach: music as creative input, AI as augmentation
  - Design decisions: why no chat, why deterministic harmonization, why one literary fragment
  - What was learned
- Demo video, 60 seconds:
  - Shot 1: applicant on camera, briefly singing into the tool
  - Shot 2: cut to screen recording of the melody appearing, harmonization happening
  - Shot 3: transition to World mode, scene blooming with the music
  - Shot 4: narrative text typing in
  - No voiceover needed if the music carries it
- Cover letter, short and specific. Lead with the project. End with a link.

**Done when:**
- Video is embedded on the case study page
- Cover letter is written and personalized
- Application is sent

---

## What NOT to do

These will tank the application. Be vigilant.

1. **Do not** build a generic shadcn-looking app. No purple-blue gradients, no card-with-shadow everywhere, no Lucide icon next to every label. Strip it down.
2. **Do not** add an AI chat anywhere. Worldsong is not a chatbot.
3. **Do not** add login / accounts. The demo is public, instant, no friction.
4. **Do not** add a tutorial overlay. The interface teaches itself through clear affordances.
5. **Do not** use emojis in the UI. Not even one. Especially not in headings.
6. **Do not** stuff the screen. White space is the most expensive design choice and it should be everywhere.
7. **Do not** add analytics, cookie banners, or feedback widgets to the demo.
8. **Do not** mention "AI-powered" anywhere in the marketing copy. The whole point is that the craft comes first.

---

## Definition of done (whole project)

- [ ] Live URL works on a cold load in under 3 seconds on a decent connection
- [ ] User can complete the full flow (record → harmonize → enter world → see narrative) in under 2 minutes
- [ ] Works on latest Chrome, Safari, Firefox desktop. Mobile Safari at least loads and plays back
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 95
- [ ] No console errors in normal use
- [ ] Demo video is recorded, edited, and embedded in the case study
- [ ] Cover letter is written and personalized to vvd
- [ ] Application is submitted

---

## North star

If at any point you're unsure about a decision, ask: **"Does this make Worldsong feel more like an instrument a serious creator would actually use?"** If yes, do it. If no, drop it.