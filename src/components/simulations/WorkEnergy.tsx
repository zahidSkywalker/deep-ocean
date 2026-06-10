'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useState, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider, ControlButton } from './shared/ControlSlider'
import { MathBox, MathSectionHeader } from './shared/MathBox'

interface DisplayData {
  pos: number
  vel: number
  ke: number
  pe: number
  work: number
}

function Scene({
  angle,
  force,
  mass,
  onDisplayUpdate,
}: {
  angle: number
  force: number
  mass: number
  onDisplayUpdate: (data: DisplayData) => void
}) {
  const blockRef = useRef<THREE.Mesh>(null)
  const posRef = useRef(0)
  const velRef = useRef(0)
  const keRef = useRef(0)
  const peRef = useRef(0)
  const workRef = useRef(0)
  const frameRef = useRef(0)

  const rad = (angle * Math.PI) / 180
  const inclineLength = 10
  const inclineHeight = inclineLength * Math.sin(rad)

  const weight = mass * 9.8
  const componentAlongSlope = weight * Math.sin(rad)
  const normalForce = weight * Math.cos(rad)
  const frictionCoef = 0.15
  const frictionForce = frictionCoef * normalForce
  const netForce = force - componentAlongSlope - frictionForce
  const acceleration = netForce / mass

  useFrame((_, delta) => {
    if (acceleration > 0 && posRef.current < inclineLength - 1) {
      velRef.current += acceleration * delta
      posRef.current += velRef.current * delta

      if (posRef.current > inclineLength - 1) {
        posRef.current = inclineLength - 1
      }

      const height = posRef.current * Math.sin(rad)
      keRef.current = 0.5 * mass * velRef.current * velRef.current
      peRef.current = mass * 9.8 * height
      workRef.current = force * posRef.current
    }

    frameRef.current++
    if (frameRef.current % 5 === 0) {
      onDisplayUpdate({
        pos: posRef.current,
        vel: velRef.current,
        ke: keRef.current,
        pe: peRef.current,
        work: workRef.current,
      })
    }

    if (blockRef.current) {
      const d = posRef.current
      blockRef.current.position.set(
        d * Math.cos(rad),
        d * Math.sin(rad) + 0.35,
        0
      )
      blockRef.current.rotation.z = -rad
    }
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <EnhancedGround width={30} depth={20} y={-0.01} />
      <OrbitControls makeDefault />

      {/* Inclined plane */}
      <mesh
        rotation={[0, 0, -rad]}
        position={[
          (inclineLength * Math.cos(rad)) / 2,
          inclineHeight / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[inclineLength, 0.2, 3]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Block */}
      <mesh ref={blockRef} position={[1, 0.5, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color="#00d4ff"
          roughness={0.25}
          metalness={0.5}
          emissive="#00d4ff"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Angle label */}
      <Text
        position={[
          (inclineLength * Math.cos(rad)) / 2,
          inclineHeight / 2 + 0.5,
          0,
        ]}
        fontSize={0.15}
        color="#888"
      >
        {`θ = ${angle}°`}
      </Text>
    </>
  )
}

export default function WorkEnergy() {
  const [angle, setAngle] = useState(30)
  const [force, setForce] = useState(20)
  const [mass, setMass] = useState(5)
  const [display, setDisplay] = useState<DisplayData>({
    pos: 0,
    vel: 0,
    ke: 0,
    pe: 0,
    work: 0,
  })

  const rad = (angle * Math.PI) / 180
  const weight = mass * 9.8
  const componentAlongSlope = weight * Math.sin(rad)
  const normalForce = weight * Math.cos(rad)
  const frictionCoef = 0.15
  const frictionForce = frictionCoef * normalForce
  const netForce = force - componentAlongSlope - frictionForce
  const acceleration = netForce / mass
  const currentHeight = display.pos * Math.sin(rad)

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT: Big 3D screen ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [8, 6, 12], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene
              angle={angle}
              force={force}
              mass={mass}
              onDisplayUpdate={setDisplay}
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
            label="Incline Angle"
            value={angle}
            onChange={setAngle}
            min={10}
            max={60}
            step={1}
            unit="°"
          />
          <ControlSlider
            label="Applied Force"
            value={force}
            onChange={setForce}
            min={0}
            max={100}
            step={1}
            unit="N"
          />
          <ControlSlider
            label="Mass"
            value={mass}
            onChange={setMass}
            min={1}
            max={20}
            step={0.5}
            unit="kg"
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
              title="Weight"
              formula="W = mg"
              substitution={`= ${mass} × 9.8`}
              result={`${weight.toFixed(1)} N`}
              color="#a78bfa"
            />
            <MathBox
              title="Component Along Slope"
              formula="F∥ = mg·sin(θ)"
              substitution={`= ${mass} × 9.8 × sin(${angle}°)`}
              result={`${componentAlongSlope.toFixed(1)} N`}
              color="#00d4ff"
            />
            <MathBox
              title="Normal Force"
              formula="N = mg·cos(θ)"
              substitution={`= ${mass} × 9.8 × cos(${angle}°)`}
              result={`${normalForce.toFixed(1)} N`}
              color="#f472b6"
            />
            <MathBox
              title="Friction Force"
              formula="f = μN"
              substitution={`= 0.15 × ${normalForce.toFixed(1)}`}
              result={`${frictionForce.toFixed(1)} N`}
              color="#fb923c"
            />
            <MathBox
              title="Net Force"
              formula="Fnet = F − mg·sin(θ) − f"
              substitution={`= ${force} − ${componentAlongSlope.toFixed(1)} − ${frictionForce.toFixed(1)}`}
              result={`${netForce.toFixed(1)} N`}
              color="#34d399"
            />
            <MathBox
              title="Acceleration"
              formula="a = Fnet / m"
              substitution={`= ${netForce.toFixed(1)} / ${mass}`}
              result={`${acceleration.toFixed(2)} m/s²`}
              color="#fbbf24"
            />
            <MathBox
              title="Work Done"
              formula="W = F · d · cos(θ)"
              substitution={`= ${force} × ${display.pos.toFixed(1)} × cos(${angle}°)`}
              result={`${display.work.toFixed(1)} J`}
              color="#60a5fa"
            />
            <MathBox
              title="Kinetic Energy"
              formula="KE = ½mv²"
              substitution={`= ½ × ${mass} × ${display.vel.toFixed(2)}²`}
              result={`${display.ke.toFixed(1)} J`}
              color="#00d4ff"
            />
            <MathBox
              title="Potential Energy"
              formula="PE = mgh"
              substitution={`= ${mass} × 9.8 × ${currentHeight.toFixed(1)}`}
              result={`${display.pe.toFixed(1)} J`}
              color="#c084fc"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
