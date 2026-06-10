'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader } from './shared/MathBox'

/* ─── 3D Scene ─── */
function Scene({ mass, force, friction }: { mass: number; force: number; friction: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const posRef = useRef(0)
  const velRef = useRef(0)

  useFrame((_, delta) => {
    const accel = (force - friction * mass * 9.8) / mass
    if (accel > 0) {
      velRef.current += accel * delta
      posRef.current += velRef.current * delta
    }
    if (posRef.current > 8) {
      posRef.current = -8
      velRef.current = 0
    }
    if (groupRef.current) {
      groupRef.current.position.x = posRef.current
    }
  })

  const size = 0.4 + mass * 0.05
  const frictionForce = friction * mass * 9.8

  return (
    <>
      <EnhancedLighting variant="default" />
      <OrbitControls makeDefault />

      <EnhancedGround width={24} depth={12} y={-0.3} />

      <group ref={groupRef}>
        {/* Block */}
        <mesh castShadow>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial
            color="#00d4ff"
            roughness={0.3}
            metalness={0.4}
            emissive="#00d4ff"
            emissiveIntensity={0.15}
          />
        </mesh>
        <Text
          position={[0, size / 2 + 0.25, 0]}
          fontSize={0.18}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {`${mass} kg`}
        </Text>

        {/* Applied force arrow (green) */}
        {force > 0 && (() => {
          const len = Math.min(force * 0.08, 3)
          return (
            <group position={[-0.3 - mass * 0.025, 0.2, 0]}>
              <mesh position={[-len / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.12, len, 8]} />
                <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.2} />
              </mesh>
              <Text position={[-(len / 2 + 0.5), 0.2, 0]} fontSize={0.15} color="#00ff88">
                {`F = ${force.toFixed(1)} N`}
              </Text>
            </group>
          )
        })()}

        {/* Friction arrow (red, opposing motion) */}
        {frictionForce > 0 && (() => {
          const len = Math.min(frictionForce * 0.08, 3)
          return (
            <group position={[0.3 + mass * 0.025, 0.2, 0]}>
              <mesh position={[len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.12, len, 8]} />
                <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.2} />
              </mesh>
              <Text position={[len / 2 + 0.5, 0.2, 0]} fontSize={0.15} color="#ff4444">
                {`f = ${frictionForce.toFixed(1)} N`}
              </Text>
            </group>
          )
        })()}
      </group>

      {/* Ground label */}
      <Text position={[-5, -0.1, 3]} fontSize={0.15} color="#444">
        {"F = ma  |  Newton's 2nd Law"}
      </Text>
    </>
  )
}

/* ─── Main Component ─── */
export default function NewtonLaws() {
  const [mass, setMass] = useState(5)
  const [force, setForce] = useState(25)
  const [friction, setFriction] = useState(0.3)

  // Computed values for math panel
  const frictionForce = friction * mass * 9.8
  const netForce = force - frictionForce
  const acceleration = netForce / mass

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, 6, 12], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene mass={mass} force={force} friction={friction} />
          </Suspense>
        </Canvas>
        {/* LIVE badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-gray-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* ====== BOTTOM PANELS ====== */}
      <div className="flex flex-col sm:flex-row flex-1 sm:flex-[1.2] min-h-0 overflow-y-auto">
        {/* CONTROLS PANEL */}
        <div className="w-full sm:w-[55%] p-3 sm:p-4 space-y-2 sm:space-y-3 border-b sm:border-b-0 sm:border-r border-white/10 bg-[#0a0a1a]">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-3.5 h-3.5 text-[#00d4ff]" />
            <h3 className="text-[11px] font-bold text-[#00d4ff] uppercase tracking-widest">Parameters</h3>
          </div>
          <ControlSlider label="Mass" value={mass} onChange={setMass} min={1} max={20} step={0.5} unit="kg" />
          <ControlSlider label="Applied Force" value={force} onChange={setForce} min={0} max={100} step={1} unit="N" color="#00ff88" />
          <ControlSlider label="Friction Coeff (μ)" value={friction} onChange={setFriction} min={0} max={1} step={0.05} unit="" color="#ff4444" />
        </div>

        {/* MATH OUTPUT PANEL */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="∫" />
          <div className="space-y-2">
            <MathBox
              title="Newton's Second Law"
              formula="F = m × a"
              substitution={`= {mass} × {acc}`}
              result={`a = ${acceleration.toFixed(2)} m/s²`}
              color="#00d4ff"
            />
            <MathBox
              title="Net Force"
              formula="F_net = F_applied − f_friction"
              substitution={`= {force} − {frictionForce}`}
              result={`F_net = ${netForce.toFixed(2)} N`}
              color="#00ff88"
            />
            <MathBox
              title="Friction Force"
              formula="f = μ × m × g"
              substitution={`= {friction} × {mass} × 9.8`}
              result={`f = ${frictionForce.toFixed(2)} N`}
              color="#ff4444"
            />
            <MathBox
              title="Acceleration"
              formula="a = F_net / m"
              substitution={`= {netForce} / {mass}`}
              result={`a = ${acceleration.toFixed(2)} m/s²`}
              color="#a78bfa"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
