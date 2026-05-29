'use client'
import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { WorldSceneContents } from '@/src/modules/WorldScene/WorldSceneContents'
import { useStore } from '@/src/store/useStore'

export function WorldCubeCanvas() {
  const accentColor = useStore(s => s.accentColor)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 1.5, 4], fov: 48 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#0e0d0c']} />
      <Suspense fallback={null}>
        <WorldSceneContents autoRotate accentColor={accentColor} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  )
}
