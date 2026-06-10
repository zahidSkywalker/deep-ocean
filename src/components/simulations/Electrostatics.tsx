'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useState, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function FieldLines({ charge1, charge2, halfDist }: { charge1: number; charge2: number; halfDist: number }) {
  const linesRef = useRef<THREE.Group>(null)
  const numLines = 16

  const lineData = useMemo(() => {
    const data: { points: number[][] }[] = []

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2
      const points: number[][] = []
      let x = -halfDist + 0.5 * Math.cos(angle)
      let z = 0.5 * Math.sin(angle)

      for (let step = 0; step < 100; step++) {
        points.push([x, 0.3, z])

        const dx1 = x - (-halfDist)
        const dz1 = z - 0
        const r1 = Math.sqrt(dx1 * dx1 + dz1 * dz1)
        const E1x = charge1 * dx1 / Math.pow(r1, 3)
        const E1z = charge1 * dz1 / Math.pow(r1, 3)

        const dx2 = x - halfDist
        const dz2 = z - 0
        const r2 = Math.sqrt(dx2 * dx2 + dz2 * dz2)
        const E2x = charge2 * dx2 / Math.pow(r2, 3)
        const E2z = charge2 * dz2 / Math.pow(r2, 3)

        const Ex = E1x + E2x
        const Ez = E1z + E2z
        const Em = Math.sqrt(Ex * Ex + Ez * Ez)

        if (Em < 0.001) break

        const stepSize = 0.15
        x += (Ex / Em) * stepSize
        z += (Ez / Em) * stepSize

        if (Math.abs(x) > 10 || Math.abs(z) > 5) break
        if (Math.sqrt((x - halfDist) ** 2 + z ** 2) < 0.3) break
      }

      data.push({ points })
    }
    return data
  }, [charge1, charge2, halfDist])

  return (
    <group ref={linesRef}>
      {lineData.map((line, i) => {
        if (line.points.length < 2) return null
        const flatPoints = line.points.flat()
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={line.points.length}
                array={new Float32Array(flatPoints)}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffaa00" transparent opacity={0.3} />
          </line>
        )
      })}
    </group>
  )
}

function Scene({ charge1, charge2, distance }: { charge1: number; charge2: number; distance: number }) {
  const k = 8.99e9
  const q1 = charge1 * 1e-6
  const q2 = charge2 * 1e-6
  const r = distance
  const F = k * Math.abs(q1 * q2) / (r * r)
  const isAttractive = charge1 * charge2 < 0

  const halfDist = distance / 2

  return (
    <>
      <EnhancedLighting variant="default" />
      <EnhancedGround width={24} depth={16} />
      <OrbitControls makeDefault />

      {/* Field lines */}
      <FieldLines charge1={charge1} charge2={charge2} halfDist={halfDist} />

      {/* Charge 1 */}
      <mesh position={[-halfDist, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={charge1 >= 0 ? '#ff4444' : '#4488ff'}
          emissive={charge1 >= 0 ? '#ff2222' : '#2244ff'}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <Text position={[-halfDist, 1.4, 0]} fontSize={0.2} color={charge1 >= 0 ? '#ff6666' : '#6699ff'}>
        {`q₁ = ${charge1 > 0 ? '+' : ''}${charge1} μC`}
      </Text>

      {/* Charge 2 */}
      <mesh position={[halfDist, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={charge2 >= 0 ? '#ff4444' : '#4488ff'}
          emissive={charge2 >= 0 ? '#ff2222' : '#2244ff'}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      <Text position={[halfDist, 1.4, 0]} fontSize={0.2} color={charge2 >= 0 ? '#ff6666' : '#6699ff'}>
        {`q₂ = ${charge2 > 0 ? '+' : ''}${charge2} μC`}
      </Text>

      {/* Force arrows */}
      {charge1 !== 0 && charge2 !== 0 && (
        <>
          <arrowHelper
            args={[
              new THREE.Vector3(isAttractive ? 1 : -1, 0, 0),
              new THREE.Vector3(-halfDist + 0.6, 0.6, 0),
              Math.min(F * 1e-6 * 2, 2.5),
              0x00ff88,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(isAttractive ? -1 : 1, 0, 0),
              new THREE.Vector3(halfDist - 0.6, 0.6, 0),
              Math.min(F * 1e-6 * 2, 2.5),
              0x00ff88,
            ]}
          />
        </>
      )}

      {/* Distance label */}
      <Text position={[0, -0.5, 0]} fontSize={0.16} color="#999">
        {`r = ${distance} m`}
      </Text>

      {/* Force type label */}
      <Text position={[0, 2.2, 0]} fontSize={0.18} color={isAttractive ? '#00ff88' : '#ff4466'}>
        {isAttractive ? '← Attractive Force →' : '→ Repulsive Force ←'}
      </Text>
    </>
  )
}

export default function Electrostatics() {
  const [charge1, setCharge1] = useState(5)
  const [charge2, setCharge2] = useState(-3)
  const [distance, setDistance] = useState(5)

  const k = 8.99e9
  const q1 = charge1 * 1e-6
  const q2 = charge2 * 1e-6
  const r = distance
  const F = k * Math.abs(q1 * q2) / (r * r)
  const isAttractive = charge1 * charge2 < 0
  const E1 = k * Math.abs(q1) / (r * r)
  const E2 = k * Math.abs(q2) / (r * r)

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 5, 14], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene charge1={charge1} charge2={charge2} distance={distance} />
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
          <ControlSlider label="Charge 1" value={charge1} onChange={setCharge1} min={-10} max={10} step={0.5} unit="μC" color="#ff6666" />
          <ControlSlider label="Charge 2" value={charge2} onChange={setCharge2} min={-10} max={10} step={0.5} unit="μC" color="#6699ff" />
          <ControlSlider label="Distance" value={distance} onChange={setDistance} min={1} max={10} step={0.5} unit="m" color="#ffaa00" />
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="⚡" />
          <div className="space-y-2">
            <MathBox
              title="Coulomb's Law"
              formula="F = k|q₁q₂| / r²"
              substitution={`k = 8.99 × 10⁹ N·m²/C²`}
              result={`F = ${F.toExponential(3)} N`}
              color="#ffaa00"
            />
            <MathDivider />
            <MathBox
              title="Electric Field (Charge 1)"
              formula="E = kQ / r²"
              substitution={`E₁ = 8.99×10⁹ × |${charge1}×10⁻⁶| / ${distance}²`}
              result={`E₁ = ${E1.toExponential(3)} N/C`}
              color="#ff6666"
            />
            <MathBox
              title="Electric Field (Charge 2)"
              formula="E = kQ / r²"
              substitution={`E₂ = 8.99×10⁹ × |${charge2}×10⁻⁶| / ${distance}²`}
              result={`E₂ = ${E2.toExponential(3)} N/C`}
              color="#6699ff"
            />
            <MathDivider />
            <MathBox
              title="Force Type"
              formula={isAttractive ? 'Opposite charges → Attractive' : 'Same charges → Repulsive'}
              color={isAttractive ? '#00ff88' : '#ff4466'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
