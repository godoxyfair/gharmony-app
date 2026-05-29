'use client'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/src/store/useStore'

const vert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */`
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uBeatPulse;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    float wave = sin(vUv.x * 5.0 + uTime * 1.4) * sin(vUv.y * 5.0 + uTime * 1.0);
    wave = wave * 0.5 + 0.5;
    vec3 color = mix(uColorA, uColorB, wave);

    float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, 1.8);
    color += rim * (0.5 + uBeatPulse * 0.5);

    float pulse = sin(uTime * 1.6) * 0.07 + 0.93 + uBeatPulse * 0.35;
    gl_FragColor = vec4(color * pulse, 1.0);
  }
`

function AnimatedCube({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const lastBeatRef = useRef(-1)
  const beatPulseRef = useRef(0)

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uColorA:    { value: new THREE.Color('#ff6030') },
    uColorB:    { value: new THREE.Color('#3080ff') },
    uBeatPulse: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (!matRef.current) return

    if (!reducedMotion) {
      const t = clock.elapsedTime
      matRef.current.uniforms.uTime.value = t

      const hue = (t * 0.04) % 1
      matRef.current.uniforms.uColorA.value.setHSL(hue, 0.9, 0.55)
      matRef.current.uniforms.uColorB.value.setHSL((hue + 0.5) % 1, 0.9, 0.55)
    }

    const beatTick = useStore.getState().beatTick
    if (beatTick !== lastBeatRef.current) {
      lastBeatRef.current = beatTick
      beatPulseRef.current = 1.0
    }
    beatPulseRef.current *= 0.84
    matRef.current.uniforms.uBeatPulse.value = beatPulseRef.current
  })

  return (
    <group>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[2.04, 2.04, 2.04]} />
        <meshBasicMaterial wireframe color="#ffffff" opacity={0.12} transparent />
      </mesh>
    </group>
  )
}

interface Props {
  autoRotate?: boolean
  accentColor?: string
  reducedMotion?: boolean
}

export function WorldSceneContents({ autoRotate = false, reducedMotion = false }: Props) {
  return (
    <>
      <AnimatedCube reducedMotion={reducedMotion} />
      <OrbitControls
        autoRotate={autoRotate && !reducedMotion}
        autoRotateSpeed={1.4}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
      />
    </>
  )
}
