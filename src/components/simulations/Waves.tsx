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

function WavelengthMarker({
  wavelength,
  amplitude,
  frequency,
  timeRef,
}: {
  wavelength: number
  amplitude: number
  frequency: number
  timeRef: React.RefObject<number>
}) {
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (ref.current) {
      const t = timeRef.current ?? 0
      const phaseShift = frequency * t
      const peakX = ((phaseShift % 1) + 0.25) * wavelength
      ref.current.position.x = peakX - 3
    }
  })

  return (
    <group ref={ref} position={[0, -amplitude - 0.5, 0]}>
      <mesh>
        <boxGeometry args={[wavelength, 0.03, 0.03]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-wavelength / 2, 0, 0]}>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[wavelength / 2, 0, 0]}>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.2} />
      </mesh>
      <Text position={[0, -0.25, 0]} fontSize={0.15} color="#ffaa00">
        {`\u03BB = ${wavelength}m`}
      </Text>
    </group>
  )
}

function Scene({ amplitude, wavelength, frequency }: { amplitude: number; wavelength: number; frequency: number }) {
  const waveRef = useRef<THREE.InstancedMesh>(null)
  const particlesRef = useRef<THREE.InstancedMesh>(null)
  const timeRef = useRef(0)

  const numWavePoints = 200
  const numParticles = 20
  const waveLength = wavelength
  const speed = frequency * wavelength

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particleDummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (waveRef.current) {
      for (let i = 0; i < numWavePoints; i++) {
        const x = (i / numWavePoints) * 16 - 8
        const y = amplitude * Math.sin(2 * Math.PI * (x / waveLength - frequency * t))
        dummy.position.set(x, y, 0)
        dummy.scale.set(0.06, 0.06, 0.06)
        dummy.updateMatrix()
        waveRef.current.setMatrixAt(i, dummy.matrix)
      }
      waveRef.current.instanceMatrix.needsUpdate = true
    }

    if (particlesRef.current) {
      for (let i = 0; i < numParticles; i++) {
        const baseX = (i / numParticles) * 12 - 6
        const y = amplitude * Math.sin(2 * Math.PI * (baseX / waveLength - frequency * t))
        particleDummy.position.set(baseX, y, 0.5)
        particleDummy.scale.set(0.18, 0.18, 0.18)
        particleDummy.updateMatrix()
        particlesRef.current.setMatrixAt(i, particleDummy.matrix)
      }
      particlesRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <OrbitControls makeDefault />

      <EnhancedGround width={30} depth={15} y={-3} />

      {/* Axis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[16, 0.02, 0.02]} />
        <meshStandardMaterial color="#444" emissive="#444" emissiveIntensity={0.1} />
      </mesh>

      {/* Wave points */}
      <instancedMesh ref={waveRef} args={[undefined, undefined, numWavePoints]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
      </instancedMesh>

      {/* Particles showing oscillation direction */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, numParticles]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
      </instancedMesh>

      {/* Amplitude marker */}
      <mesh position={[-8.5, amplitude / 2, 0]}>
        <boxGeometry args={[0.02, amplitude, 0.02]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[-9.3, amplitude / 2, 0]} fontSize={0.18} color="#00ff88">
        {`A = ${amplitude}m`}
      </Text>

      {/* Wavelength marker */}
      <WavelengthMarker wavelength={waveLength} amplitude={amplitude} frequency={frequency} timeRef={timeRef} />

      {/* Propagation direction arrow */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-7, -1.5, 0), 2, 0xffff00]} />
      <Text position={[-7, -1.8, 0]} fontSize={0.15} color="#ffff00">
        Propagation
      </Text>

      {/* Wave particles label */}
      <Text position={[-7, 3.5, 0]} fontSize={0.15} color="#00d4ff">
        {'\u2022 Wave particles'}
      </Text>
      <Text position={[-7, 3.0, 0]} fontSize={0.15} color="#ff6b6b">
        {'\u2022 Transverse motion'}
      </Text>
    </>
  )
}

export default function Waves() {
  const [amplitude, setAmplitude] = useState(1.5)
  const [wavelength, setWavelength] = useState(2)
  const [frequency, setFrequency] = useState(2)

  const speed = frequency * wavelength
  const period = 1 / frequency
  const omega = 2 * Math.PI * frequency
  const waveNumber = (2 * Math.PI) / wavelength

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 4, 12], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene amplitude={amplitude} wavelength={wavelength} frequency={frequency} />
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
          <ControlSlider label="Amplitude" value={amplitude} onChange={setAmplitude} min={0.1} max={3} step={0.1} unit="m" color="#00d4ff" />
          <ControlSlider label="Wavelength" value={wavelength} onChange={setWavelength} min={0.5} max={5} step={0.5} unit="m" color="#00d4ff" />
          <ControlSlider label="Frequency" value={frequency} onChange={setFrequency} min={0.5} max={5} step={0.1} unit="Hz" color="#00d4ff" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Wave Speed</p>
              <p className="text-sm font-mono font-bold text-[#00ff88]">{speed.toFixed(2)} m/s</p>
            </div>
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Period</p>
              <p className="text-sm font-mono font-bold text-[#ffaa00]">{period.toFixed(2)} s</p>
            </div>
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="\u222B" />
          <div className="space-y-2">
            <MathBox
              title="Wave Equation"
              formula="y = A\u00B7sin(2\u03C0(x/\u03BB - ft))"
              substitution={`A=${amplitude}, \u03BB=${wavelength}, f=${frequency}`}
              color="#00d4ff"
            />
            <MathDivider />
            <MathBox
              title="Wave Speed"
              formula="v = f\u00B7\u03BB"
              substitution={`${frequency} \u00D7 ${wavelength}`}
              result={`v = ${speed.toFixed(2)} m/s`}
              color="#00ff88"
            />
            <MathBox
              title="Period"
              formula="T = 1/f"
              substitution={`1/${frequency}`}
              result={`T = ${period.toFixed(2)} s`}
              color="#ffaa00"
            />
            <MathDivider />
            <MathBox
              title="Angular Frequency"
              formula="\u03C9 = 2\u03C0f"
              substitution={`2\u03C0 \u00D7 ${frequency}`}
              result={`\u03C9 = ${omega.toFixed(2)} rad/s`}
              color="#ff6b6b"
            />
            <MathBox
              title="Wave Number"
              formula="k = 2\u03C0/\u03BB"
              substitution={`2\u03C0 / ${wavelength}`}
              result={`k = ${waveNumber.toFixed(2)} rad/m`}
              color="#a78bfa"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
