'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader } from './shared/MathBox'

function StarField() {
  const ref = useRef<THREE.Points>(null)
  const positions = new Float32Array(600)
  for (let i = 0; i < 200; i++) {
    positions[i * 3] = ((i * 0.5 - 50) % 40) - 20
    positions[i * 3 + 1] = (i * 7) % 30 + 3
    positions[i * 3 + 2] = ((i * 13) % 30) - 15
  }

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.6}
      />
    </points>
  )
}

function Scene({
  mass1,
  mass2,
  distance,
}: {
  mass1: number
  mass2: number
  distance: number
}) {
  const G = 6.674e-11
  const m1 = mass1 * 1e12
  const m2 = mass2 * 1e12
  const r = distance
  const F = (G * m1 * m2) / (r * r)

  const body1Ref = useRef<THREE.Mesh>(null)
  const body2Ref = useRef<THREE.Mesh>(null)
  const arrow1Ref = useRef<THREE.ArrowHelper>(null)
  const arrow2Ref = useRef<THREE.ArrowHelper>(null)

  const halfDist = distance / 2
  const r1 = Math.max(0.3, 0.3 + mass1 * 0.02)
  const r2 = Math.max(0.3, 0.3 + mass2 * 0.02)

  const arrowLen = Math.min(F * 1e8, 3)

  useFrame(() => {
    if (body1Ref.current) body1Ref.current.position.x = -halfDist
    if (body2Ref.current) body2Ref.current.position.x = halfDist

    if (arrow1Ref.current) {
      arrow1Ref.current.position.set(-halfDist + r1 + 0.1, 0, 0)
      arrow1Ref.current.setDirection(new THREE.Vector3(1, 0, 0))
      arrow1Ref.current.setLength(arrowLen, arrowLen * 0.2, arrowLen * 0.1)
    }
    if (arrow2Ref.current) {
      arrow2Ref.current.position.set(halfDist - r2 - 0.1, 0, 0)
      arrow2Ref.current.setDirection(new THREE.Vector3(-1, 0, 0))
      arrow2Ref.current.setLength(arrowLen, arrowLen * 0.2, arrowLen * 0.1)
    }
  })

  const fieldLineCount = 6

  return (
    <>
      <EnhancedLighting variant="space" />
      <EnhancedGround
        width={40}
        depth={40}
        color="#0a0a14"
        gridColor1="#111"
        gridColor2="#0a0a14"
        y={-2}
      />
      <OrbitControls makeDefault />

      {/* Stars */}
      <StarField />

      {/* Body 1 */}
      <mesh ref={body1Ref} position={[-halfDist, 0, 0]} castShadow>
        <sphereGeometry args={[r1, 32, 32]} />
        <meshStandardMaterial
          color="#4488ff"
          roughness={0.3}
          metalness={0.5}
          emissive="#2244aa"
          emissiveIntensity={0.4}
        />
      </mesh>
      <Text
        position={[-halfDist, r1 + 0.4, 0]}
        fontSize={0.18}
        color="#4488ff"
      >
        {`M₁ = ${mass1}×10¹² kg`}
      </Text>

      {/* Body 2 */}
      <mesh ref={body2Ref} position={[halfDist, 0, 0]} castShadow>
        <sphereGeometry args={[r2, 32, 32]} />
        <meshStandardMaterial
          color="#ff8844"
          roughness={0.3}
          metalness={0.5}
          emissive="#aa4422"
          emissiveIntensity={0.4}
        />
      </mesh>
      <Text
        position={[halfDist, r2 + 0.4, 0]}
        fontSize={0.18}
        color="#ff8844"
      >
        {`M₂ = ${mass2}×10¹² kg`}
      </Text>

      {/* Force arrows */}
      <arrowHelper
        ref={arrow1Ref}
        args={[
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-halfDist + 1, 0, 0),
          1,
          0x00ff88,
        ]}
      />
      <arrowHelper
        ref={arrow2Ref}
        args={[
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(halfDist - 1, 0, 0),
          1,
          0x00ff88,
        ]}
      />

      {/* Field lines */}
      {Array.from({ length: fieldLineCount }).map((_, i) => {
        const y = (i - (fieldLineCount - 1) / 2) * 0.4
        return (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry
              args={[0.01, 0.01, distance - r1 - r2, 4]}
            />
            <meshBasicMaterial
              color="#00ff88"
              transparent
              opacity={0.15}
            />
          </mesh>
        )
      })}

      {/* Distance label */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.15}
        color="#888"
      >
        {`r = ${distance} m`}
      </Text>
    </>
  )
}

export default function Gravitation() {
  const [mass1, setMass1] = useState(20)
  const [mass2, setMass2] = useState(15)
  const [distance, setDistance] = useState(8)

  const G = 6.674e-11
  const m1 = mass1 * 1e12
  const m2 = mass2 * 1e12
  const F = (G * m1 * m2) / (distance * distance)
  const g1 = (G * m1) / (distance * distance)
  const g2 = (G * m2) / (distance * distance)

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT: Big 3D screen ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, 5, 14], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene
              mass1={mass1}
              mass2={mass2}
              distance={distance}
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
            label="Mass 1"
            value={mass1}
            onChange={setMass1}
            min={1}
            max={50}
            step={1}
            unit="×10¹² kg"
          />
          <ControlSlider
            label="Mass 2"
            value={mass2}
            onChange={setMass2}
            min={1}
            max={50}
            step={1}
            unit="×10¹² kg"
          />
          <ControlSlider
            label="Distance"
            value={distance}
            onChange={setDistance}
            min={2}
            max={15}
            step={0.5}
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
              title="Gravitational Constant"
              formula="G = 6.674 × 10⁻¹¹ N·m²/kg²"
              result="Universal constant"
              color="#a78bfa"
            />
            <MathBox
              title="Gravitational Force"
              formula="F = Gm₁m₂ / r²"
              substitution={`= 6.674e-11 × ${m1.toExponential(2)} × ${m2.toExponential(2)} / ${distance}²`}
              result={`F = ${F.toExponential(3)} N`}
              color="#00d4ff"
            />
            <MathBox
              title="Field Strength at M₂"
              formula="g₁ = GM₁ / r²"
              substitution={`= 6.674e-11 × ${m1.toExponential(2)} / ${distance}²`}
              result={`g₁ = ${g1.toExponential(3)} N/kg`}
              color="#34d399"
            />
            <MathBox
              title="Field Strength at M₁"
              formula="g₂ = GM₂ / r²"
              substitution={`= 6.674e-11 × ${m2.toExponential(2)} / ${distance}²`}
              result={`g₂ = ${g2.toExponential(3)} N/kg`}
              color="#fb923c"
            />
            <MathBox
              title="Inverse Square Law"
              formula="F ∝ 1/r²"
              substitution="As r increases, F decreases quadratically"
              result={`At r = ${distance}: F = ${F.toExponential(3)} N`}
              color="#f472b6"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
