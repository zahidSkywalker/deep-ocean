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
function Scene({ radius, angularVelocity, mass }: { radius: number; angularVelocity: number; mass: number }) {
  const ballRef = useRef<THREE.Mesh>(null)
  const velArrowRef = useRef<THREE.ArrowHelper>(null)
  const forceArrowRef = useRef<THREE.ArrowHelper>(null)
  const stringRef = useRef<THREE.Mesh>(null)
  const angleRef = useRef(0)

  const centripetalForce = mass * angularVelocity * angularVelocity * radius
  const centripetalAccel = angularVelocity * angularVelocity * radius
  const linearVelocity = angularVelocity * radius
  const period = (2 * Math.PI) / angularVelocity
  const frequency = 1 / period

  useFrame((_, delta) => {
    angleRef.current += angularVelocity * delta
    const a = angleRef.current

    if (ballRef.current) {
      const x = radius * Math.cos(a)
      const z = radius * Math.sin(a)
      ballRef.current.position.set(x, 0.5, z)

      // Update string connecting center to ball
      if (stringRef.current) {
        const midX = x / 2
        const midZ = z / 2
        stringRef.current.position.set(midX, 0.5, midZ)
        stringRef.current.scale.set(1, 1, radius)
        stringRef.current.lookAt(new THREE.Vector3(0, 0.5, 0))
      }

      // Update velocity arrow (tangential, green)
      if (velArrowRef.current) {
        velArrowRef.current.position.set(x, 0.5, z)
        const vLen = Math.min(linearVelocity * 0.08, 2)
        const vDir = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).normalize()
        velArrowRef.current.setDirection(vDir)
        velArrowRef.current.setLength(vLen, vLen * 0.2, vLen * 0.1)
      }

      // Update centripetal force arrow (inward, red)
      if (forceArrowRef.current) {
        forceArrowRef.current.position.set(x, 0.5, z)
        const fLen = Math.min(centripetalForce * 0.004, 2)
        const fDir = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)).normalize()
        forceArrowRef.current.setDirection(fDir)
        forceArrowRef.current.setLength(fLen, fLen * 0.2, fLen * 0.1)
      }
    }
  })

  const ballSize = 0.2 + mass * 0.015

  return (
    <>
      <EnhancedLighting variant="default" />
      <OrbitControls makeDefault />

      <EnhancedGround width={30} depth={30} y={-0.01} />

      {/* Orbit path ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[radius - 0.03, radius + 0.03, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Center pivot */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.4, 16]} />
        <meshStandardMaterial color="#555" roughness={0.3} metalness={0.5} emissive="#333" emissiveIntensity={0.1} />
      </mesh>
      <Text position={[0, 0.6, 0]} fontSize={0.15} color="#888">
        Center
      </Text>

      {/* String / tether */}
      <mesh ref={stringRef} position={[radius / 2, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
        <meshStandardMaterial color="#aaa" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Orbiting ball */}
      <mesh ref={ballRef} position={[radius, 0.5, 0]} castShadow>
        <sphereGeometry args={[ballSize, 32, 32]} />
        <meshStandardMaterial
          color="#00d4ff"
          roughness={0.2}
          metalness={0.5}
          emissive="#00d4ff"
          emissiveIntensity={0.3}
        />
      </mesh>
      <Text
        position={[radius, 0.5 + ballSize + 0.2, 0]}
        fontSize={0.13}
        color="white"
        anchorX="center"
      >
        {`${mass} kg`}
      </Text>

      {/* Velocity arrow (green) */}
      <arrowHelper
        ref={velArrowRef}
        args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(radius, 0.5, 0), 1, 0x00ff88]}
      />

      {/* Centripetal force arrow (red) */}
      <arrowHelper
        ref={forceArrowRef}
        args={[new THREE.Vector3(-1, 0, 0), new THREE.Vector3(radius, 0.5, 0), 1, 0xff4444]}
      />

      {/* Legend text */}
      <Text position={[-6, 3.5, 0]} fontSize={0.14} color="#00ff88">
        → Green: Velocity (tangential)
      </Text>
      <Text position={[-6, 3.1, 0]} fontSize={0.14} color="#ff4444">
        → Red: Centripetal Force
      </Text>
    </>
  )
}

/* ─── Main Component ─── */
export default function CircularMotion() {
  const [radius, setRadius] = useState(4)
  const [angularVelocity, setAngularVelocity] = useState(2)
  const [mass, setMass] = useState(5)

  // Computed values for math panel
  const centripetalForce = mass * angularVelocity * angularVelocity * radius
  const centripetalAccel = angularVelocity * angularVelocity * radius
  const linearVelocity = angularVelocity * radius
  const period = (2 * Math.PI) / angularVelocity
  const frequency = 1 / period

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, 8, 12], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene radius={radius} angularVelocity={angularVelocity} mass={mass} />
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
          <ControlSlider label="Radius" value={radius} onChange={setRadius} min={1} max={10} step={0.5} unit="m" />
          <ControlSlider label="Angular Velocity" value={angularVelocity} onChange={setAngularVelocity} min={0.1} max={5} step={0.1} unit="rad/s" color="#a78bfa" />
          <ControlSlider label="Mass" value={mass} onChange={setMass} min={0.5} max={10} step={0.5} unit="kg" color="#ffaa00" />
        </div>

        {/* MATH OUTPUT PANEL */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="∫" />
          <div className="space-y-2">
            <MathBox
              title="Centripetal Force"
              formula="F_c = m × ω² × r"
              substitution={`= ${mass} × ${angularVelocity}² × ${radius}`}
              result={`F_c = ${centripetalForce.toFixed(2)} N`}
              color="#ff4444"
            />
            <MathBox
              title="Linear Velocity"
              formula="v = ω × r"
              substitution={`= ${angularVelocity} × ${radius}`}
              result={`v = ${linearVelocity.toFixed(2)} m/s`}
              color="#00ff88"
            />
            <MathBox
              title="Period"
              formula="T = 2π / ω"
              substitution={`= 2π / ${angularVelocity}`}
              result={`T = ${period.toFixed(2)} s`}
              color="#00d4ff"
            />
            <MathBox
              title="Frequency"
              formula="f = 1 / T"
              substitution={`= 1 / ${period.toFixed(2)}`}
              result={`f = ${frequency.toFixed(2)} Hz`}
              color="#a78bfa"
            />
            <MathBox
              title="Centripetal Acceleration"
              formula="a_c = ω² × r"
              substitution={`= ${angularVelocity}² × ${radius}`}
              result={`a_c = ${centripetalAccel.toFixed(2)} m/s²`}
              color="#ffaa00"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
