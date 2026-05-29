import { type NextRequest, NextResponse } from 'next/server'
import { Log } from '@/src/utils/logger'

const WORD_RE = /^[a-zA-Z'-]{1,40}$/

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get('word') ?? ''
  if (!WORD_RE.test(word)) {
    return NextResponse.json({ error: 'Invalid word' }, { status: 400 })
  }
  try {
    const res = await fetch(
      `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=10`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      Log.error('Datamuse API error', { status: res.status })
      return NextResponse.json({ error: 'Failed to fetch rhymes' }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    Log.error('Datamuse fetch failed', err)
    return NextResponse.json({ error: 'Failed to fetch rhymes' }, { status: 502 })
  }
}
