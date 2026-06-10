'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider, ControlButton } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

const MAX_PARTICLES = 100

function Scene({
  halfLife,
  showAlpha,
  showBeta,
  showGamma,
}: {
  halfLife: number
  showAlpha: boolean
  showBeta: boolean
  showGamma: boolean
}) {
  const sourceRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const lastEmitRef = useRef(0)
  const decayCountRef = useRef(0)

  const particleRefs = useRef<(THREE.Mesh | null)[]>(Array.from({ length: MAX_PARTICLES }, () => null))
  const particleData = useRef(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      type: 'alpha' as 'alpha' | 'beta' | 'gamma',
      position: [0, 0, 0] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      age: 0,
    }))
  )

  const lambda = Math.LN2 / halfLife

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    // Glow pulse on source
    if (sourceRef.current) {
      const mat = sourceRef.current.material as THREE.MeshStandardMaterial
      if (mat) {
        mat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.15
      }
    }

    if (t - lastEmitRef.current > 0.3) {
      lastEmitRef.current = t
      const types: ('alpha' | 'beta' | 'gamma')[] = []
      if (showAlpha) types.push('alpha')
      if (showBeta) types.push('beta')
      if (showGamma) types.push('gamma')

      if (types.length > 0) {
        for (let k = 0; k < 2; k++) {
          for (let i = 0; i < MAX_PARTICLES; i++) {
            if (!particleData.current[i].active) {
              const type = types[i % types.length]
              const angle1 = ((i * 137 + k * 89) % 360) * (Math.PI / 180)
              const angle2 = ((i * 73 + k * 47) % 360) * (Math.PI / 180)
              const speed = type === 'alpha' ? 2 : type === 'beta' ? 5 : 8

              particleData.current[i] = {
                active: true,
                type,
                position: [0, 1, 0],
                velocity: [
                  Math.cos(angle1) * Math.sin(angle2) * speed,
                  Math.cos(angle2) * speed * 0.5 + 1,
                  Math.sin(angle1) * Math.sin(angle2) * speed,
                ],
                age: 0,
              }
              decayCountRef.current++
              break
            }
          }
        }
      }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particleData.current[i]
      if (!p.active) continue

      p.age += delta
      p.position[0] += p.velocity[0] * delta
      p.position[1] += p.velocity[1] * delta
      p.position[2] += p.velocity[2] * delta

      if (p.age > 3) {
        p.active = false
      }

      const mesh = particleRefs.current[i]
      if (mesh) {
        if (p.active) {
          mesh.visible = true
          mesh.position.set(p.position[0], p.position[1], p.position[2])
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.opacity = Math.max(0, 1 - p.age * 0.3)
            // Update color based on particle type
            const color = p.type === 'alpha' ? '#ff4444' : p.type === 'beta' ? '#00d4ff' : '#ffaa00'
            mesh.material.color.set(color)
            mesh.material.emissive.set(color)
          }
        } else {
          mesh.visible = false
        }
      }
    }
  })

  return (
    <>
      <EnhancedLighting variant="space" />
      <EnhancedGround width={24} depth={18} />
      <OrbitControls makeDefault />

      {/* Radioactive source */}
      <mesh ref={sourceRef} position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.65, 1.1, 32]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={0.3} metalness={0.3} roughness={0.4} />
      </mesh>
      <Text position={[0, 2.1, 0]} fontSize={0.22} color="#ffaa00">
        Radioactive Source
      </Text>
      {/* Radiation symbol */}
      <mesh position={[0, 1.85, 0]}>
        <torusGeometry args={[0.18, 0.025, 12, 24]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>

      {/* Shielding container */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[2.2, 0.7, 2.2]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Particle pool */}
      {Array.from({ length: MAX_PARTICLES }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { particleRefs.current[i] = el }}
          position={[0, -10, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.6} transparent />
        </mesh>
      ))}
    </>
  )
}

export default function Radioactivity() {
  const [halfLife, setHalfLife] = useState(5)
  const [showAlpha, setShowAlpha] = useState(true)
  const [showBeta, setShowBeta] = useState(true)
  const [showGamma, setShowGamma] = useState(true)

  const lambda = Math.LN2 / halfLife

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 4, 10], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene halfLife={halfLife} showAlpha={showAlpha} showBeta={showBeta} showGamma={showGamma} />
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
          <ControlSlider label="Half-life" value={halfLife} onChange={setHalfLife} min={2} max={30} step={1} unit="s" color="#ffaa00" />
          <div className="flex gap-2">
            <ControlButton
              label="α Alpha"
              onClick={() => setShowAlpha(!showAlpha)}
              color="#ff4444"
              variant={showAlpha ? 'filled' : 'outline'}
            />
            <ControlButton
              label="β Beta"
              onClick={() => setShowBeta(!showBeta)}
              color="#00d4ff"
              variant={showBeta ? 'filled' : 'outline'}
            />
            <ControlButton
              label="γ Gamma"
              onClick={() => setShowGamma(!showGamma)}
              color="#ffaa00"
              variant={showGamma ? 'filled' : 'outline'}
            />
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="☢" />
          <div className="space-y-2">
            <MathBox
              title="Decay Law"
              formula="N(t) = N₀ · e^(−λt)"
              color="#ffaa00"
            />
            <MathBox
              title="Decay Constant"
              formula="λ = ln(2) / t½"
              substitution={`λ = 0.6931 / ${halfLife}`}
              result={`λ = ${lambda.toFixed(4)} s⁻¹`}
              color="#00ff88"
            />
            <MathDivider />
            <MathBox
              title="α Particles"
              formula="+2 charge, 4 amu"
              substitution="Helium nucleus (²He⁴)"
              color="#ff4444"
            />
            <MathBox
              title="β Particles"
              formula="−1 charge, ~0 amu"
              substitution="Electron (e⁻)"
              color="#00d4ff"
            />
            <MathBox
              title="γ Rays"
              formula="0 charge, 0 amu"
              substitution="Electromagnetic radiation"
              color="#ffaa00"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
