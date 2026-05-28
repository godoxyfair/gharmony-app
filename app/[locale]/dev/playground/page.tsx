'use client'

import { useState } from 'react'
import { Button } from '@/src/ui/Button'
import { IconButton } from '@/src/ui/IconButton'
import { Slider } from '@/src/ui/Slider'
import { Tooltip } from '@/src/ui/Tooltip'

export default function PlaygroundPage() {
  const [sliderValue, setSliderValue] = useState(50)

  return (
    <main style={{ padding: '4rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Button</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button view="filled">Filled</Button>
          <Button view="outlined">Outlined</Button>
          <Button view="ghost">Ghost</Button>
          <Button size="small">Small</Button>
          <Button size="large">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>IconButton</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Tooltip content="Play">
            <IconButton label="Play">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>
            </IconButton>
          </Tooltip>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Slider</h2>
        <Slider label="Volume" min={0} max={100} value={sliderValue} onChange={setSliderValue} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Typography</h2>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', lineHeight: 1 }}>Display — GHarmony</p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--color-muted)' }}>Body — Music is the prompt.</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>Mono — A4 · 440Hz · 120 BPM</p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Colors</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['bg', 'fg', 'muted', 'accent', 'surface'].map(name => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 4, background: `var(--color-${name})`, border: '1px solid var(--color-border)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--color-muted)' }}>{name}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
