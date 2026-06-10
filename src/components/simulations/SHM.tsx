'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function SHMGraphLine({
  amplitude,
  omega,
  timeRef,
}: {
  amplitude: number
  omega: number
  timeRef: React.RefObject<number>
}) {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const lineRef = useRef<THREE.Line>(null)
  const maxPoints = 200

  useFrame(() => {
    const t = timeRef.current ?? 0

    if (!geomRef.current) {
      const buf = new Float32Array(maxPoints * 3)
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(buf, 3))
      geom.setDrawRange(0, 0)
      geomRef.current = geom
      if (lineRef.current) {
        lineRef.current.geometry = geom
      }
    }

    const points: [number, number, number][] = []
    for (let i = 0; i < maxPoints; i++) {
      const gt = t - (maxPoints - i) * 0.05
      if (gt < 0) continue
      const gx = (i - maxPoints / 2) * 0.05
      const gy = amplitude * Math.cos(omega * gt) * 0.8 + 4
      points.push([gx, gy, 0])
    }

    if (geomRef.current && points.length > 1) {
      const arr = new Float32Array(points.length * 3)
      points.forEach((p, idx) => {
        arr[idx * 3] = p[0]
        arr[idx * 3 + 1] = p[1]
        arr[idx * 3 + 2] = p[2]
      })
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      geomRef.current.setDrawRange(0, points.length)
      geomRef.current.computeBoundingSphere()
    }
  })

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#00d4ff" linewidth={1} />
    </line>
  )
}

function SHMSpring({
  amplitude,
  omega,
  timeRef,
}: {
  amplitude: number
  omega: number
  timeRef: React.RefObject<number>
}) {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const coils = 14

  useFrame(() => {
    const t = timeRef.current ?? 0
    const displacement = amplitude * Math.cos(omega * t)

    const wallX = -4
    const massX = displacement
    const springStart = wallX + 0.15
    const springEnd = massX - 0.3
    const springLength = springEnd - springStart

    const points: THREE.Vector3[] = []
    const segs = coils * 10
    for (let i = 0; i <= segs; i++) {
      const frac = i / segs
      const x = springStart + frac * springLength
      const phase = frac * coils * Math.PI * 2
      const r = 0.25
      points.push(new THREE.Vector3(x, 1 + Math.cos(phase) * r, Math.sin(phase) * r))
    }

    if (geomRef.current) {
      const posArr = new Float32Array(points.length * 3)
      points.forEach((p, i) => {
        posArr[i * 3] = p.x
        posArr[i * 3 + 1] = p.y
        posArr[i * 3 + 2] = p.z
      })
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
      geomRef.current.computeBoundingSphere()
    }
  })

  const initialCount = coils * 10 + 1
  const initialPos = new Float32Array(initialCount * 3)

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={initialCount}
          array={initialPos}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#aaa" />
    </line>
  )
}

function Scene({ amplitude, mass, springConstant }: { amplitude: number; mass: number; springConstant: number }) {
  const omega = Math.sqrt(springConstant / mass)
  const period = (2 * Math.PI) / omega
  const frequency = 1 / period

  const massRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current
    const displacement = amplitude * Math.cos(omega * t)

    if (massRef.current) {
      massRef.current.position.x = displacement
    }
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <EnhancedGround width={20} depth={12} />
      <OrbitControls makeDefault />

      {/* Wall */}
      <mesh position={[-4, 1, 0]} castShadow>
        <boxGeometry args={[0.35, 2.2, 2.2]} />
        <meshStandardMaterial color="#555" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Spring */}
      <SHMSpring amplitude={amplitude} omega={omega} timeRef={timeRef} />

      {/* Mass */}
      <mesh ref={massRef} position={[amplitude, 1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Equilibrium marker */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.03, 1.6, 0.03]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.5} />
      </mesh>
      <Text position={[0, -0.3, 0]} fontSize={0.13} color="#ff6666">
        Equilibrium (x=0)
      </Text>

      {/* Amplitude markers */}
      <mesh position={[-amplitude, 0.3, 0]}>
        <boxGeometry args={[0.03, 1.4, 0.03]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} />
      </mesh>
      <mesh position={[amplitude, 0.3, 0]}>
        <boxGeometry args={[0.03, 1.4, 0.03]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} />
      </mesh>
      <Text position={[-amplitude, -0.3, 0]} fontSize={0.13} color="#00ff88">
        -A
      </Text>
      <Text position={[amplitude, -0.3, 0]} fontSize={0.13} color="#00ff88">
        +A
      </Text>

      {/* Graph axes */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[10, 0.03, 0.03]} />
        <meshBasicMaterial color="#555" />
      </mesh>
      <Text position={[5.2, 4.2, 0]} fontSize={0.13} color="#999">
        t
      </Text>
      <Text position={[-5.8, 4, 0]} fontSize={0.13} color="#999">
        x(t)
      </Text>

      {/* Graph line */}
      <SHMGraphLine amplitude={amplitude} omega={omega} timeRef={timeRef} />
    </>
  )
}

export default function SHM() {
  const [amplitude, setAmplitude] = useState(1.5)
  const [mass, setMass] = useState(1)
  const [springConstant, setSpringConstant] = useState(20)

  const omega = Math.sqrt(springConstant / mass)
  const period = (2 * Math.PI) / omega
  const frequency = 1 / period
  const maxVelocity = amplitude * omega

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 5, 12], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene amplitude={amplitude} mass={mass} springConstant={springConstant} />
          </Suspense>
        </Canvas>
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-gray-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* ====== BOTTOM PANELS ====== */}
      <div className="flex flex-col sm:flex-row flex-1 sm:flex-[1.2] min-h-0 overflow-y-auto">
        {/* CONTROLS - LEFT */}
        <div className="w-full sm:w-[55%] p-3 sm:p-4 space-y-2 sm:space-y-3 border-b sm:border-b-0 sm:border-r border-white/10 bg-[#0a0a1a]">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-3.5 h-3.5 text-[#00d4ff]" />
            <h3 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-widest">Parameters</h3>
          </div>
          <ControlSlider label="Amplitude" value={amplitude} onChange={setAmplitude} min={0.2} max={3} step={0.1} unit="m" color="#00ff88" />
          <ControlSlider label="Mass" value={mass} onChange={setMass} min={0.5} max={10} step={0.5} unit="kg" color="#00d4ff" />
          <ControlSlider label="Spring Constant" value={springConstant} onChange={setSpringConstant} min={5} max={80} step={1} unit="N/m" color="#ffaa00" />
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="∿" />
          <div className="space-y-2">
            <MathBox
              title="SHM Equation"
              formula="x(t) = A · cos(ωt)"
              substitution={`A = ${amplitude} m`}
              color="#00d4ff"
            />
            <MathBox
              title="Angular Frequency"
              formula="ω = √(k / m)"
              substitution={`ω = √(${springConstant} / ${mass})`}
              result={`ω = ${omega.toFixed(3)} rad/s`}
              color="#ffaa00"
            />
            <MathDivider />
            <MathBox
              title="Period"
              formula="T = 2π / ω"
              substitution={`T = 2π / ${omega.toFixed(3)}`}
              result={`T = ${period.toFixed(3)} s`}
              color="#00ff88"
            />
            <MathBox
              title="Frequency"
              formula="f = 1 / T"
              substitution={`f = 1 / ${period.toFixed(3)}`}
              result={`f = ${frequency.toFixed(3)} Hz`}
              color="#a78bfa"
            />
            <MathDivider />
            <MathBox
              title="Velocity"
              formula="v(t) = −Aω · sin(ωt)"
              substitution={`v_max = A × ω = ${amplitude} × ${omega.toFixed(3)}`}
              result={`v_max = ${maxVelocity.toFixed(3)} m/s`}
              color="#ff6666"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
