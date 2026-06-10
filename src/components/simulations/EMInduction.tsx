'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function Scene({ magnetSpeed, coilTurns, magnetStrength }: { magnetSpeed: number; coilTurns: number; magnetStrength: number }) {
  const magnetRef = useRef<THREE.Group>(null)
  const needleRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)
  const frameRef = useRef(0)

  const [emfDisplay, setEmfDisplay] = useState(0)

  const coilRadius = 1.5
  const travelDist = 8

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    const magnetPos = Math.sin(t * magnetSpeed * 0.5) * travelDist

    if (magnetRef.current) {
      magnetRef.current.position.x = magnetPos
    }

    const velocity = magnetSpeed * travelDist * Math.cos(t * magnetSpeed * 0.5) * 0.5
    const area = Math.PI * coilRadius * coilRadius
    const emf = coilTurns * magnetStrength * area * Math.abs(velocity) * 0.0001

    if (needleRef.current) {
      const maxAngle = Math.PI / 4
      const deflection = Math.max(-maxAngle, Math.min(maxAngle, velocity * 0.3))
      needleRef.current.rotation.z = -deflection
    }

    frameRef.current++
    if (frameRef.current % 5 === 0) {
      setEmfDisplay(emf)
    }
  })

  const numVisibleCoils = Math.min(Math.floor(coilTurns / 10), 6)

  return (
    <>
      <EnhancedLighting variant="circuit" />
      <OrbitControls makeDefault />

      {/* Coil */}
      <group position={[0, 0, 0]}>
        {Array.from({ length: numVisibleCoils }).map((_, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[i * 0.08 - numVisibleCoils * 0.04, 0, 0]} castShadow>
            <torusGeometry args={[coilRadius, 0.06, 16, 48]} />
            <meshStandardMaterial color="#cc8844" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        <Text position={[0, coilRadius + 0.5, 0]} fontSize={0.16} color="#cc8844">
          {`Coil (${coilTurns} turns)`}
        </Text>
      </group>

      {/* Magnet */}
      <group ref={magnetRef} position={[travelDist, 0, 0]}>
        <mesh position={[-0.6, 0, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.8]} />
          <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.3} metalness={0.4} roughness={0.3} />
        </mesh>
        <Text position={[-0.6, 0.65, 0]} fontSize={0.22} color="#ff6666">
          N
        </Text>
        <mesh position={[0.6, 0, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.8]} />
          <meshStandardMaterial color="#4488ff" emissive="#2244ff" emissiveIntensity={0.3} metalness={0.4} roughness={0.3} />
        </mesh>
        <Text position={[0.6, 0.65, 0]} fontSize={0.22} color="#6699ff">
          S
        </Text>
      </group>

      {/* Wire connections */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([coilRadius, 0, 0, coilRadius + 2, 0, 0, coilRadius + 2, -3, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#cc8844" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={new Float32Array([coilRadius, -0.3, 0, coilRadius + 2.3, -0.3, 0, coilRadius + 2.3, -3, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#cc8844" />
      </line>

      {/* Galvanometer */}
      <group position={[coilRadius + 2, -3.5, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.35, 32]} />
          <meshStandardMaterial color="#444" metalness={0.5} roughness={0.3} />
        </mesh>
        <Text position={[0, 0.35, 0]} fontSize={0.2} color="#00d4ff">
          G
        </Text>
        <Text position={[0, -0.8, 0]} fontSize={0.13} color="#888">
          Galvanometer
        </Text>
        <group ref={needleRef}>
          <mesh>
            <boxGeometry args={[0.04, 0.85, 0.04]} />
            <meshBasicMaterial color="#ff4444" />
          </mesh>
        </group>
        <mesh position={[-0.7, 0, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.03]} />
          <meshBasicMaterial color="#666" />
        </mesh>
        <mesh position={[0.7, 0, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.03]} />
          <meshBasicMaterial color="#666" />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.03]} />
          <meshBasicMaterial color="#666" />
        </mesh>
      </group>

      {/* 3D EMF label on galvanometer */}
      <Text position={[coilRadius + 2, -5, 0]} fontSize={0.15} color="#00ff88">
        {`ε ≈ ${emfDisplay.toFixed(4)} V`}
      </Text>
    </>
  )
}

export default function EMInduction() {
  const [magnetSpeed, setMagnetSpeed] = useState(2)
  const [coilTurns, setCoilTurns] = useState(50)
  const [magnetStrength, setMagnetStrength] = useState(2)

  const coilRadius = 1.5
  const area = Math.PI * coilRadius * coilRadius

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 5, 14], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene magnetSpeed={magnetSpeed} coilTurns={coilTurns} magnetStrength={magnetStrength} />
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
          <ControlSlider label="Magnet Speed" value={magnetSpeed} onChange={setMagnetSpeed} min={0.5} max={5} step={0.5} unit="m/s" color="#ff6666" />
          <ControlSlider label="Coil Turns" value={coilTurns} onChange={setCoilTurns} min={10} max={100} step={5} unit="turns" color="#cc8844" />
          <ControlSlider label="Magnet Strength" value={magnetStrength} onChange={setMagnetStrength} min={0.1} max={2} step={0.1} unit="T" color="#6699ff" />
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="∮" />
          <div className="space-y-2">
            <MathBox
              title="Faraday's Law"
              formula="ε = −N × dΦ/dt"
              color="#ffaa00"
            />
            <MathBox
              title="EMF"
              formula="ε = N × B × A × |v|"
              substitution={`N=${coilTurns}, B=${magnetStrength}T, A=${area.toFixed(2)}m²`}
              color="#00d4ff"
            />
            <MathDivider />
            <MathBox
              title="Magnetic Flux"
              formula="Φ = B × A × cos(θ)"
              substitution={`Φ = ${magnetStrength} × ${area.toFixed(2)}`}
              result={`Φ_max = ${(magnetStrength * area).toFixed(3)} Wb`}
              color="#a78bfa"
            />
            <MathDivider />
            <MathBox
              title="Parameters"
              formula={`N = ${coilTurns} turns`}
              substitution={`B = ${magnetStrength} T  |  v = ${magnetSpeed} m/s`}
              color="#cc8844"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
