'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function CurrentParticles({
  current,
  circuitWidth,
  circuitHeight,
}: {
  current: number
  circuitWidth: number
  circuitHeight: number
}) {
  const particlesRef = useRef<THREE.InstancedMesh>(null)
  const timeRef = useRef(0)
  const numParticles = 24
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const perimeter = 2 * (circuitWidth + circuitHeight)
  const speed = Math.min(current * 0.5, 5)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = (timeRef.current * speed * 0.3) % 1

    if (particlesRef.current) {
      for (let i = 0; i < numParticles; i++) {
        const frac = ((t + i / numParticles) % 1)
        const dist = frac * perimeter
        let x: number, y: number

        if (dist < circuitWidth) {
          x = -circuitWidth / 2 + dist
          y = 0
        } else if (dist < circuitWidth + circuitHeight) {
          x = circuitWidth / 2
          y = dist - circuitWidth
        } else if (dist < 2 * circuitWidth + circuitHeight) {
          x = circuitWidth / 2 - (dist - circuitWidth - circuitHeight)
          y = circuitHeight
        } else {
          x = -circuitWidth / 2
          y = circuitHeight - (dist - 2 * circuitWidth - circuitHeight)
        }

        dummy.position.set(x, y, 0.1)
        dummy.scale.set(0.08, 0.08, 0.08)
        dummy.updateMatrix()
        particlesRef.current.setMatrixAt(i, dummy.matrix)
      }
      particlesRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, numParticles]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.8} />
    </instancedMesh>
  )
}

function Scene({ voltage, resistance }: { voltage: number; resistance: number }) {
  const current = voltage / resistance
  const power = voltage * current

  const circuitWidth = 6
  const circuitHeight = 4

  return (
    <>
      <EnhancedLighting variant="circuit" />
      <OrbitControls makeDefault />

      {/* Circuit wires */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[circuitWidth, 0.06, 0.06]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-circuitWidth / 2, circuitHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, circuitHeight, 0.06]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, circuitHeight, 0]} castShadow>
          <boxGeometry args={[circuitWidth, 0.06, 0.06]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[circuitWidth / 2, circuitHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, circuitHeight, 0.06]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Battery (left side) */}
      <group position={[-circuitWidth / 2, circuitHeight / 2, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 1.4, 0.5]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.3} />
        </mesh>
        <Text position={[0, 0, 0.35]} fontSize={0.2} color="#00d4ff">
          {`${voltage}V`}
        </Text>
        <Text position={[0, -1.1, 0.35]} fontSize={0.13} color="#888">
          Battery
        </Text>
        <Text position={[0.25, 0.7, 0.35]} fontSize={0.18} color="#ff4444">
          +
        </Text>
        <Text position={[0.25, -0.7, 0.35]} fontSize={0.18} color="#4488ff">
          −
        </Text>
      </group>

      {/* Resistor (top) */}
      <group position={[0, circuitHeight, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.4, 0.35, 0.35]} />
          <meshStandardMaterial color="#886644" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[-0.35, 0, 0.18]}>
          <boxGeometry args={[0.1, 0.37, 0.02]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
        <mesh position={[0, 0, 0.18]}>
          <boxGeometry args={[0.1, 0.37, 0.02]} />
          <meshBasicMaterial color="#00d4ff" />
        </mesh>
        <Text position={[0, -0.45, 0]} fontSize={0.16} color="#ffaa00">
          {`${resistance}Ω`}
        </Text>
        <Text position={[0, -0.8, 0]} fontSize={0.13} color="#888">
          Resistor
        </Text>
      </group>

      {/* Ammeter (right side) */}
      <group position={[circuitWidth / 2, circuitHeight / 2, 0.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color="#444" metalness={0.5} roughness={0.3} />
        </mesh>
        <Text position={[0, 0, 0.6]} fontSize={0.2} color="#00ff88">
          A
        </Text>
        <Text position={[0, -0.9, 0.35]} fontSize={0.13} color="#888">
          Ammeter
        </Text>
      </group>

      {/* Current flow particles */}
      <CurrentParticles current={current} circuitWidth={circuitWidth} circuitHeight={circuitHeight} />

      {/* Current direction arrows */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, circuitHeight, 0.3), 0.8, 0x00ff88]} />
      <arrowHelper args={[new THREE.Vector3(0, -1, 0), new THREE.Vector3(circuitWidth / 2, circuitHeight - 0.5, 0.3), 0.8, 0x00ff88]} />
      <arrowHelper args={[new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0.3), 0.8, 0x00ff88]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-circuitWidth / 2, 0.5, 0.3), 0.8, 0x00ff88]} />
    </>
  )
}

export default function OhmsLaw() {
  const [voltage, setVoltage] = useState(12)
  const [resistance, setResistance] = useState(20)

  const current = voltage / resistance
  const power = voltage * current

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 5, 12], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene voltage={voltage} resistance={resistance} />
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
          <ControlSlider label="Voltage" value={voltage} onChange={setVoltage} min={1} max={24} step={0.5} unit="V" color="#ffaa00" />
          <ControlSlider label="Resistance" value={resistance} onChange={setResistance} min={1} max={100} step={1} unit="Ω" color="#00d4ff" />
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="Ω" />
          <div className="space-y-2">
            <MathBox
              title="Ohm's Law"
              formula="V = I × R"
              substitution={`${voltage}V = I × ${resistance}Ω`}
              color="#ffaa00"
            />
            <MathBox
              title="Current"
              formula="I = V / R"
              substitution={`I = ${voltage} / ${resistance}`}
              result={`I = ${current.toFixed(4)} A`}
              color="#00ff88"
            />
            <MathDivider />
            <MathBox
              title="Power"
              formula="P = V × I = I²R = V²/R"
              substitution={`P = ${voltage} × ${current.toFixed(4)}`}
              result={`P = ${power.toFixed(3)} W`}
              color="#00d4ff"
            />
            <MathDivider />
            <MathBox
              title="Values"
              formula={`V = ${voltage} V  |  R = ${resistance} Ω`}
              result={`I = ${current.toFixed(4)} A  |  P = ${power.toFixed(3)} W`}
              color="#a78bfa"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
