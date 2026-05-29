# Worldsong

**Music is the prompt.**

Hum a melody. Watch a world grow from it.

---

Worldsong is a browser-based creative instrument — part composer's sketchpad, part world-building canvas. You sing into it. It listens, finds the key, builds harmony from first principles, and assembles a scene: fog and terrain and particles that breathe with your tempo

---

## Two modes. One flow.

**Hum** — Sing into the mic. Pitch detection draws your melody in real time. A harmonization engine derives a chord progression using Krumhansl-Schmuckler key detection and diatonic voice leading. Choose a style — folk, cinematic, lo-fi, rock — and hear your melody come back with a full arrangement behind it. Edit chords. Add lyrics. Export MIDI or WAV.

**World** — Feature feature! Your composition drives a 3D scene. Loudness moves fog. Brightness shifts light from warm to cool. The current chord root tints the key light. One short literary fragment — two or three sentences, streamed from Gemini — gives the place a name it didn't have before.

---

## What it is not

Not a generator. Not a chatbot. Not a template engine. The melody is yours. The harmony follows from your notes. The world reflects your music back at you.

The only AI in the system is one sentence of atmosphere. You wrote the rest.

---

## Stack

Next.js 15 · TypeScript · Tone.js · react-three-fiber · Framer Motion · Tailwind CSS · Gemini 2.5 Flash (narrative only)

---

## Run locally

```bash
yarn install
yarn dev
```

Requires `GEMINI_API_KEY` in `.env.local` for narrative generation. Everything else runs without a key.
