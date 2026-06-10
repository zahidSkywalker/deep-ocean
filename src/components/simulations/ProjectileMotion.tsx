'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider, ControlButton } from './shared/ControlSlider'
import { MathBox, MathSectionHeader } from './shared/MathBox'

/* ─── 3D Scene ─── */
function Scene({
  angle,
  velocity,
  gravity,
  isFiring,
  trailGeomRef,
  timeRef,
  trailCountRef,
}: {
  angle: number
  velocity: number
  gravity: number
  isFiring: boolean
  trailGeomRef: React.MutableRefObject<THREE.BufferGeometry | null>
  timeRef: React.MutableRefObject<number>
  trailCountRef: React.MutableRefObject<number>
}) {
  const ballRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Points>(null)
  const initializedRef = useRef(false)

  const rad = (angle * Math.PI) / 180
  const totalTime = (2 * velocity * Math.sin(rad)) / gravity
  const range = (velocity * velocity * Math.sin(2 * rad)) / gravity
  const maxHeight = (velocity * velocity * Math.sin(rad) * Math.sin(rad)) / (2 * gravity)
  const vx = velocity * Math.cos(rad)
  const vy = velocity * Math.sin(rad)

  useFrame((_, delta) => {
    // Initialize trail geometry once
    if (!initializedRef.current) {
      initializedRef.current = true
      const buf = new Float32Array(3000)
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(buf, 3))
      geom.setDrawRange(0, 0)
      trailGeomRef.current = geom
    }

    if (!isFiring || !ballRef.current || !trailRef.current) return

    timeRef.current += delta * 1.5
    const t = timeRef.current
    const x = velocity * Math.cos(rad) * t
    const y = velocity * Math.sin(rad) * t - 0.5 * gravity * t * t

    ballRef.current.position.x = x
    ballRef.current.position.y = Math.max(y, 0)

    const geom = trailGeomRef.current
    if (geom && y >= 0 && trailCountRef.current < 1000) {
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
      const idx = trailCountRef.current * 3
      if (posAttr && posAttr.array) {
        posAttr.array[idx] = x
        posAttr.array[idx + 1] = Math.max(y, 0)
        posAttr.array[idx + 2] = 0
        posAttr.needsUpdate = true
      }
      trailCountRef.current++
      geom.setDrawRange(0, trailCountRef.current)
    }

    if (t > totalTime) {
      ballRef.current.position.x = 0
      ballRef.current.position.y = 0
    }
  })

  const cannonAngle = rad

  return (
    <>
      <EnhancedLighting variant="lab" />
      <OrbitControls makeDefault />

      <EnhancedGround width={50} depth={20} y={0} />

      {/* Cannon barrel */}
      <group position={[0, 0.5, 0]} rotation={[0, 0, cannonAngle]}>
        <mesh castShadow position={[1, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
          <meshStandardMaterial color="#444" roughness={0.3} metalness={0.7} emissive="#222" emissiveIntensity={0.1} />
        </mesh>
      </group>

      {/* Cannon base */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 12]} />
        <meshStandardMaterial color="#333" roughness={0.4} metalness={0.5} emissive="#111" emissiveIntensity={0.1} />
      </mesh>

      {/* Projectile ball */}
      <mesh ref={ballRef} position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#00d4ff" roughness={0.2} metalness={0.5} emissive="#00d4ff" emissiveIntensity={0.3} />
      </mesh>

      {/* Trail particles */}
      <points ref={trailRef}>
        <bufferGeometry />
        <pointsMaterial size={0.08} color="#00d4ff" transparent opacity={0.6} />
      </points>

      {/* Landing marker ring */}
      <mesh position={[range, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.4, 32]} />
        <meshStandardMaterial color="#ff4444" transparent opacity={0.5} emissive="#ff4444" emissiveIntensity={0.2} />
      </mesh>
      <Text position={[range, 0.3, 0]} fontSize={0.18} color="#ff4444">
        {`R = ${range.toFixed(1)} m`}
      </Text>

      {/* Max height vertical line */}
      <line position={[range / 2, 0.01, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, maxHeight, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff88" />
      </line>
      <Text position={[range / 2 - 1, maxHeight + 0.2, 0]} fontSize={0.15} color="#00ff88">
        {`H = ${maxHeight.toFixed(1)} m`}
      </Text>

      {/* 3D angle arc indicator */}
      <Text position={[1.8, 1.5, 0]} fontSize={0.15} color="#ffaa00">
        {`${angle}°`}
      </Text>
    </>
  )
}

/* ─── Main Component ─── */
export default function ProjectileMotion() {
  const [angle, setAngle] = useState(45)
  const [velocity, setVelocity] = useState(20)
  const [gravity, setGravity] = useState(9.8)
  const [isFiring, setIsFiring] = useState(false)

  const trailGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const timeRef = useRef(0)
  const trailCountRef = useRef(0)

  const rad = (angle * Math.PI) / 180
  const totalTime = (2 * velocity * Math.sin(rad)) / gravity
  const range = (velocity * velocity * Math.sin(2 * rad)) / gravity
  const maxHeight = (velocity * velocity * Math.sin(rad) * Math.sin(rad)) / (2 * gravity)
  const vx = velocity * Math.cos(rad)
  const vy = velocity * Math.sin(rad)

  const handleLaunch = useCallback(() => {
    timeRef.current = 0
    trailCountRef.current = 0
    if (trailGeomRef.current) {
      const posAttr = trailGeomRef.current.getAttribute('position') as THREE.BufferAttribute
      if (posAttr) {
        posAttr.set(0)
        posAttr.needsUpdate = true
      }
      trailGeomRef.current.setDrawRange(0, 0)
    }
    setIsFiring(true)
    // Stop firing after the projectile lands
    setTimeout(() => setIsFiring(false), (totalTime / 1.5 + 0.5) * 1000)
  }, [totalTime])

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, 8, 18], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene
              angle={angle}
              velocity={velocity}
              gravity={gravity}
              isFiring={isFiring}
              trailGeomRef={trailGeomRef}
              timeRef={timeRef}
              trailCountRef={trailCountRef}
            />
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
          <ControlSlider label="Launch Angle" value={angle} onChange={setAngle} min={0} max={90} step={1} unit="°" color="#ffaa00" />
          <ControlSlider label="Initial Velocity" value={velocity} onChange={setVelocity} min={1} max={50} step={1} unit="m/s" />
          <ControlSlider label="Gravity" value={gravity} onChange={setGravity} min={1} max={20} step={0.5} unit="m/s²" color="#ff4444" />
          <ControlButton label="🚀 LAUNCH" onClick={handleLaunch} color="#00d4ff" />
        </div>

        {/* MATH OUTPUT PANEL */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="∫" />
          <div className="space-y-2">
            <MathBox
              title="Range"
              formula="R = v²·sin(2θ) / g"
              substitution={`= ${velocity}²·sin(2×${angle}°) / ${gravity}`}
              result={`R = ${range.toFixed(2)} m`}
              color="#ff4444"
            />
            <MathBox
              title="Maximum Height"
              formula="H = v²·sin²(θ) / (2g)"
              substitution={`= ${velocity}²·sin²(${angle}°) / (2×${gravity})`}
              result={`H = ${maxHeight.toFixed(2)} m`}
              color="#00ff88"
            />
            <MathBox
              title="Time of Flight"
              formula="T = 2·v·sin(θ) / g"
              substitution={`= 2×${velocity}·sin(${angle}°) / ${gravity}`}
              result={`T = ${totalTime.toFixed(2)} s`}
              color="#00d4ff"
            />
            <MathBox
              title="Horizontal Velocity"
              formula="v_x = v·cos(θ)"
              substitution={`= ${velocity}·cos(${angle}°)`}
              result={`v_x = ${vx.toFixed(2)} m/s`}
              color="#a78bfa"
            />
            <MathBox
              title="Vertical Velocity (initial)"
              formula="v_y₀ = v·sin(θ)"
              substitution={`= ${velocity}·sin(${angle}°)`}
              result={`v_y₀ = ${vy.toFixed(2)} m/s`}
              color="#ffaa00"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
