'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader } from './shared/MathBox'

function SpringVisual({
  anchorY,
  displacement,
  omega,
  timeRef,
}: {
  anchorY: number
  displacement: number
  omega: number
  timeRef: { current: number }
}) {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const coils = 10

  useFrame(() => {
    const t = timeRef.current
    const y = displacement * Math.cos(omega * t)
    const massY = -5 - y

    const points: THREE.Vector3[] = []
    const segs = coils * 10
    const springTop = anchorY - 0.1
    const springBottom = massY + 0.4
    const springLength = springTop - springBottom

    for (let i = 0; i <= segs; i++) {
      const frac = i / segs
      const py = springTop - frac * springLength
      const phase = frac * coils * Math.PI * 2
      const r = 0.3
      points.push(
        new THREE.Vector3(Math.cos(phase) * r, py, Math.sin(phase) * r)
      )
    }

    if (geomRef.current) {
      const posArr = new Float32Array(points.length * 3)
      points.forEach((p, i) => {
        posArr[i * 3] = p.x
        posArr[i * 3 + 1] = p.y
        posArr[i * 3 + 2] = p.z
      })
      geomRef.current.setAttribute(
        'position',
        new THREE.BufferAttribute(posArr, 3)
      )
      geomRef.current.computeBoundingSphere()
    }
  })

  const initialSegs = coils * 10 + 1
  const initialPos = new Float32Array(initialSegs * 3)

  return (
    <group>
      <line>
        <bufferGeometry ref={geomRef}>
          <bufferAttribute
            attach="attributes-position"
            count={initialSegs}
            array={initialPos}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#aaa" />
      </line>
    </group>
  )
}

function MassLabel({
  mass,
  timeRef,
  omega,
  displacement,
}: {
  mass: number
  timeRef: { current: number }
  omega: number
  displacement: number
}) {
  const textRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const t = timeRef.current
    const y = displacement * Math.cos(omega * t)
    if (textRef.current) {
      textRef.current.position.y = -5 - y + 0.8
    }
  })

  return (
    <group ref={textRef} position={[0, 0, 0]}>
      <Text fontSize={0.18} color="#00d4ff">
        {`${mass} kg`}
      </Text>
    </group>
  )
}

function Scene({
  springConstant,
  mass,
  displacement,
}: {
  springConstant: number
  mass: number
  displacement: number
}) {
  const massRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const omega = Math.sqrt(springConstant / mass)
  const period = (2 * Math.PI) / omega
  const anchorY = 2

  useFrame((_, delta) => {
    timeRef.current += delta
    if (massRef.current) {
      const y = displacement * Math.cos(omega * timeRef.current)
      massRef.current.position.y = -5 - y
    }
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <OrbitControls makeDefault />

      {/* Background wall */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[10, 15]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* Anchor point */}
      <mesh position={[0, anchorY, 0]} castShadow>
        <boxGeometry args={[1, 0.2, 0.5]} />
        <meshStandardMaterial
          color="#444"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <Text
        position={[0, anchorY + 0.4, 0]}
        fontSize={0.15}
        color="#888"
      >
        Anchor
      </Text>

      {/* Spring */}
      <SpringVisual
        anchorY={anchorY}
        displacement={displacement}
        omega={omega}
        timeRef={timeRef}
      />

      {/* Mass */}
      <mesh
        ref={massRef}
        position={[0, -5 - displacement, 0]}
        castShadow
      >
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial
          color="#00d4ff"
          roughness={0.25}
          metalness={0.5}
          emissive="#00d4ff"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Mass label */}
      <MassLabel
        mass={mass}
        omega={omega}
        displacement={displacement}
        timeRef={timeRef}
      />

      {/* Equilibrium line */}
      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[2, 0.02, 0.01]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      <Text position={[1.3, -5, 0]} fontSize={0.12} color="#ff4444">
        Equilibrium
      </Text>
    </>
  )
}

export default function Elasticity() {
  const [springConstant, setSpringConstant] = useState(30)
  const [mass, setMass] = useState(2)
  const [displacement, setDisplacement] = useState(1)

  const omega = Math.sqrt(springConstant / mass)
  const period = (2 * Math.PI) / omega
  const frequency = 1 / period
  const hookeForce = springConstant * displacement

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT: Big 3D screen ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, -2, 8], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene
              springConstant={springConstant}
              mass={mass}
              displacement={displacement}
            />
          </Suspense>
        </Canvas>
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-gray-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* ====== BOTTOM PANELS ====== */}
      <div className="flex flex-col sm:flex-row flex-1 sm:flex-[1.2] min-h-0 overflow-y-auto">
        {/* CONTROLS PANEL - LEFT */}
        <div className="w-full sm:w-[55%] p-3 sm:p-4 space-y-2 sm:space-y-3 border-b sm:border-b-0 sm:border-r border-white/10 bg-[#0a0a1a]">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-3.5 h-3.5 text-[#00d4ff]" />
            <h3 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-widest">
              Parameters
            </h3>
          </div>
          <ControlSlider
            label="Spring Constant k"
            value={springConstant}
            onChange={setSpringConstant}
            min={5}
            max={100}
            step={1}
            unit="N/m"
          />
          <ControlSlider
            label="Mass"
            value={mass}
            onChange={setMass}
            min={0.5}
            max={10}
            step={0.5}
            unit="kg"
          />
          <ControlSlider
            label="Displacement"
            value={displacement}
            onChange={setDisplacement}
            min={0.1}
            max={3}
            step={0.1}
            unit="m"
          />
        </div>

        {/* MATH OUTPUT PANEL - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader
            label="Mathematical Representation"
            icon="∫"
          />
          <div className="space-y-2">
            <MathBox
              title="Hooke's Law"
              formula="F = −kx"
              substitution={`= −${springConstant} × ${displacement}`}
              result={`F = ${hookeForce.toFixed(1)} N`}
              color="#a78bfa"
            />
            <MathBox
              title="Angular Frequency"
              formula="ω = √(k/m)"
              substitution={`= √(${springConstant}/${mass})`}
              result={`ω = ${omega.toFixed(2)} rad/s`}
              color="#00d4ff"
            />
            <MathBox
              title="Period"
              formula="T = 2π/ω"
              substitution={`= 2π / ${omega.toFixed(2)}`}
              result={`T = ${period.toFixed(2)} s`}
              color="#34d399"
            />
            <MathBox
              title="Displacement"
              formula="x(t) = A·cos(ωt)"
              substitution={`= ${displacement}·cos(${omega.toFixed(2)}·t)`}
              result="Simple harmonic motion"
              color="#f472b6"
            />
            <MathBox
              title="Frequency"
              formula="f = 1/T"
              substitution={`= 1 / ${period.toFixed(2)}`}
              result={`f = ${frequency.toFixed(2)} Hz`}
              color="#fbbf24"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
