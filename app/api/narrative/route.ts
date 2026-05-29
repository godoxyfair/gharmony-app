import { type NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Log } from '@/src/utils/logger'

let dailyCount = 0
let resetAt = Date.now() + 86_400_000
const MAX_DAILY = 1400

const FALLBACKS = [
  'The warm edge bleeds into blue before it reaches the center. The geometry holds.',
  'Two frequencies at the same boundary. Neither wins.',
  'The surface is not moving. The color is.',
  'Chromatic drift at low tempo. Edges stay fixed while the interior changes state.',
  'The transition between faces is sharper than expected. The hue does not agree with the form.',
  'Saturation drops near the corners. This is not an error.',
  'The color advances from one pole and the other follows, always equidistant.',
  'An interval in the key of the current light. It repeats.',
]

type NarrativeBody = {
  key: string
  mode: 'major' | 'minor'
  tempo: number
  dynamics: 'quiet' | 'medium' | 'loud'
  texture: 'sparse' | 'layered' | 'dense'
  instruments: string
}

function isValidBody(raw: unknown): raw is NarrativeBody {
  if (!raw || typeof raw !== 'object') return false
  const b = raw as Record<string, unknown>
  return (
    typeof b.key === 'string' && b.key.length >= 1 && b.key.length <= 3 &&
    (b.mode === 'major' || b.mode === 'minor') &&
    typeof b.tempo === 'number' && b.tempo >= 20 && b.tempo <= 300 &&
    (b.dynamics === 'quiet' || b.dynamics === 'medium' || b.dynamics === 'loud') &&
    (b.texture === 'sparse' || b.texture === 'layered' || b.texture === 'dense') &&
    typeof b.instruments === 'string' && b.instruments.length <= 120
  )
}

function randomFallback(): Response {
  const text = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

export async function POST(request: NextRequest) {
  if (Date.now() > resetAt) { dailyCount = 0; resetAt = Date.now() + 86_400_000 }
  if (dailyCount >= MAX_DAILY) return randomFallback()

  let body: NarrativeBody
  try {
    const raw = await request.json()
    if (!isValidBody(raw)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    body = raw
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return randomFallback()

  dailyCount++

  const { key, mode, tempo, dynamics, texture, instruments } = body
  const prompt = `You write short poetic captions for a music visualizer. The visual is a slowly rotating 3D cube with shifting color waves — its surface pulses and bleeds between hues, geometric edges glow faintly.

The music playing has these qualities:
- Key: ${key} ${mode}
- Tempo: ${tempo} BPM
- Texture: ${texture}
- Dynamics: ${dynamics}
- Instruments: ${instruments}

Write 1-2 sentences. The text appears over the cube as a caption or internal monologue about the color and motion the viewer sees.

Requirements:
- Reference color, light, geometry, or surface quality — not landscape or nature.
- Tone: cool, precise, slightly detached. Like a field note about a phenomenon.
- No metaphor inflation. No "it feels like" or "as if". State what is.
- Forbidden words: whispers, ancient, ethereal, mystical, pulsing, vibrating, alive.
- 20-40 words. No title, no quotes, just the sentence(s).`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContentStream(prompt)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (err) {
          Log.error('Gemini stream error', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    Log.error('Gemini narrative failed', err)
    dailyCount--
    return randomFallback()
  }
}
