'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function Scene({ frequency, amplitude }: { frequency: number; amplitude: number }) {
  const particlesRef = useRef<THREE.InstancedMesh>(null)
  const timeRef = useRef(0)
  const numParticles = 300
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorRef = useMemo(() => new THREE.Color(), [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (particlesRef.current) {
      for (let i = 0; i < numParticles; i++) {
        const row = Math.floor(i / 20)
        const col = i % 20
        const baseX = col * 0.5 - 4.5
        const baseZ = row * 0.5 - 3.5

        const displacement = amplitude * 0.3 * Math.sin(2 * Math.PI * (baseX * 0.5 - frequency * t))
        const x = baseX + displacement

        const pressure = -amplitude * 0.3 * 2 * Math.PI * 0.5 * Math.cos(2 * Math.PI * (baseX * 0.5 - frequency * t))
        const density = 1 + pressure * 0.5

        dummy.position.set(x, 0, baseZ)
        const s = Math.max(0.3, density * 0.3)
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        particlesRef.current.setMatrixAt(i, dummy.matrix)

        const p = pressure * 0.5
        if (p > 0) {
          colorRef.setRGB(p, 0.2, 0.8 - p * 0.6)
        } else {
          colorRef.setRGB(0.2 - p * 0.1, 0.6 + p * 0.2, 1)
        }
        particlesRef.current.setColorAt(i, colorRef)
      }
      particlesRef.current.instanceMatrix.needsUpdate = true
      if (particlesRef.current.instanceColor) {
        particlesRef.current.instanceColor.needsUpdate = true
      }
    }
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <OrbitControls makeDefault />

      <EnhancedGround width={20} depth={15} y={-0.5} />

      {/* Speaker */}
      <group position={[-6, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 1.2, 1.5]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0, 0.76]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#222" metalness={0.4} roughness={0.2} emissive="#00d4ff" emissiveIntensity={0.1} />
        </mesh>
        <Text position={[0, 1.0, 0]} fontSize={0.2} color="#00d4ff">
          Speaker
        </Text>
      </group>

      {/* Particles (air molecules) */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, numParticles]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial metalness={0.3} roughness={0.4} />
      </instancedMesh>

      {/* Labels */}
      <Text position={[-2, 2, 0]} fontSize={0.18} color="#ff4444">
        Compression
      </Text>
      <Text position={[2, 2, 0]} fontSize={0.18} color="#4488ff">
        Rarefaction
      </Text>

      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-5, -0.3, 0), 2, 0xffff00]} />
      <Text position={[-5, -0.6, 0]} fontSize={0.15} color="#ffff00">
        Propagation
      </Text>
    </>
  )
}

export default function SoundWaves() {
  const [frequency, setFrequency] = useState(2)
  const [amplitude, setAmplitude] = useState(1)

  const speedOfSound = 343
  const wavelengthSound = speedOfSound / frequency

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 6, 10], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene frequency={frequency} amplitude={amplitude} />
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
          <ControlSlider label="Frequency" value={frequency} onChange={setFrequency} min={0.5} max={5} step={0.1} unit="Hz" color="#00d4ff" />
          <ControlSlider label="Amplitude" value={amplitude} onChange={setAmplitude} min={0.1} max={2} step={0.1} color="#00d4ff" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Speed of Sound</p>
              <p className="text-sm font-mono font-bold text-[#00ff88]">343 m/s</p>
            </div>
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Wavelength</p>
              <p className="text-sm font-mono font-bold text-[#ffaa00]">{wavelengthSound.toFixed(1)} m</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[10px] text-gray-400">Compression (high pressure)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-400">Rarefaction (low pressure)</span>
            </div>
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="\u222B" />
          <div className="space-y-2">
            <MathBox
              title="Displacement Equation"
              formula="\u0394x = A\u00B7sin(2\u03C0(x/\u03BB - ft))"
              substitution={`A=${amplitude}, f=${frequency}`}
              color="#00d4ff"
            />
            <MathDivider />
            <MathBox
              title="Speed of Sound"
              formula="v = 343 m/s (in air at 20\u00B0C)"
              result="Speed of sound in air"
              color="#00ff88"
            />
            <MathBox
              title="Wavelength"
              formula="\u03BB = v / f"
              substitution={`343 / ${frequency}`}
              result={`\u03BB = ${wavelengthSound.toFixed(1)} m`}
              color="#ffaa00"
            />
            <MathDivider />
            <MathBox
              title="Compression"
              formula="High pressure region"
              substitution="Particles clustered together"
              result="\u0394P > 0, \u03C1 > \u03C1\u2080"
              color="#ff4444"
            />
            <MathBox
              title="Rarefaction"
              formula="Low pressure region"
              substitution="Particles spread apart"
              result="\u0394P < 0, \u03C1 < \u03C1\u2080"
              color="#4488ff"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
