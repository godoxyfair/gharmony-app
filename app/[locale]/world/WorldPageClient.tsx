'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { WorldSceneContents } from '@/src/modules/WorldScene/WorldSceneContents'
import { NarrativeDisplay } from './_components/NarrativeDisplay/NarrativeDisplay'
import { useStore } from '@/src/store/useStore'
import styles from './styles.module.css'

function SceneFallback() {
  return (
    <div className={styles.fallback}>
      <span className={styles.fallbackText}>world</span>
    </div>
  )
}

export function WorldPageClient() {
  const accentColor = useStore(s => s.accentColor)

  return (
    <div className={styles.canvasWrap}>
      <Suspense fallback={<SceneFallback />}>
        <Canvas
          camera={{ position: [3, 2.5, 4.5], fov: 52 }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0e0d0c']} />
          <WorldSceneContents autoRotate accentColor={accentColor} />
        </Canvas>
      </Suspense>
      <NarrativeDisplay />
    </div>
  )
}
