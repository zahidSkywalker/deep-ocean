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

interface CollisionData {
  collided: boolean
  afterV1: number
  afterV2: number
}

function Scene({
  mass1,
  mass2,
  velocity1,
  velocity2,
  elastic,
  resetKey,
  onCollision,
}: {
  mass1: number
  mass2: number
  velocity1: number
  velocity2: number
  elastic: boolean
  resetKey: number
  onCollision: (data: CollisionData) => void
}) {
  const ball1Ref = useRef<THREE.Mesh>(null)
  const ball2Ref = useRef<THREE.Mesh>(null)
  const pos1Ref = useRef(-5)
  const pos2Ref = useRef(5)
  const vel1Ref = useRef(velocity1)
  const vel2Ref = useRef(velocity2)
  const collidedRef = useRef(false)

  const r1 = 0.3 + mass1 * 0.03
  const r2 = 0.3 + mass2 * 0.03

  useFrame((_, delta) => {
    pos1Ref.current += vel1Ref.current * delta * 0.5
    pos2Ref.current += vel2Ref.current * delta * 0.5

    if (
      !collidedRef.current &&
      pos1Ref.current + r1 >= pos2Ref.current - r2
    ) {
      collidedRef.current = true
      const m1 = mass1
      const m2 = mass2
      const u1 = vel1Ref.current
      const u2 = vel2Ref.current
      let v1: number
      let v2: number
      if (elastic) {
        v1 = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2)
        v2 = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2)
      } else {
        const vf = (m1 * u1 + m2 * u2) / (m1 + m2)
        v1 = vf
        v2 = vf
      }
      vel1Ref.current = v1
      vel2Ref.current = v2
      onCollision({ collided: true, afterV1: v1, afterV2: v2 })
    }

    if (ball1Ref.current) ball1Ref.current.position.x = pos1Ref.current
    if (ball2Ref.current) ball2Ref.current.position.x = pos2Ref.current
  })

  return (
    <>
      <EnhancedLighting variant="default" />
      <EnhancedGround width={30} depth={10} y={-0.01} />
      <OrbitControls makeDefault />

      {/* Ball 1 */}
      <mesh ref={ball1Ref} position={[-5, r1, 0]} castShadow>
        <sphereGeometry args={[r1, 32, 32]} />
        <meshStandardMaterial
          color="#00d4ff"
          roughness={0.25}
          metalness={0.5}
          emissive="#00d4ff"
          emissiveIntensity={0.25}
        />
      </mesh>
      <Text
        position={[-5, r1 * 2 + 0.4, 0]}
        fontSize={0.2}
        color="#00d4ff"
      >
        {`${mass1} kg`}
      </Text>

      {/* Ball 2 */}
      <mesh ref={ball2Ref} position={[5, r2, 0]} castShadow>
        <sphereGeometry args={[r2, 32, 32]} />
        <meshStandardMaterial
          color="#ff6b6b"
          roughness={0.25}
          metalness={0.5}
          emissive="#ff6b6b"
          emissiveIntensity={0.25}
        />
      </mesh>
      <Text
        position={[5, r2 * 2 + 0.4, 0]}
        fontSize={0.2}
        color="#ff6b6b"
      >
        {`${mass2} kg`}
      </Text>

      {/* Velocity arrows */}
      <arrowHelper
        args={[
          new THREE.Vector3(velocity1 > 0 ? 1 : -1, 0, 0),
          new THREE.Vector3(-5, r1, 0),
          Math.abs(velocity1) * 0.15,
          0x00d4ff,
        ]}
      />
      <arrowHelper
        args={[
          new THREE.Vector3(velocity2 > 0 ? 1 : -1, 0, 0),
          new THREE.Vector3(5, r2, 0),
          Math.abs(velocity2) * 0.15,
          0xff6b6b,
        ]}
      />
    </>
  )
}

export default function Momentum() {
  const [mass1, setMass1] = useState(5)
  const [mass2, setMass2] = useState(3)
  const [velocity1, setVelocity1] = useState(5)
  const [velocity2, setVelocity2] = useState(-3)
  const [elastic, setElastic] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const [collisionData, setCollisionData] = useState<CollisionData>({
    collided: false,
    afterV1: 0,
    afterV2: 0,
  })

  const handleReset = () => {
    setCollisionData({ collided: false, afterV1: 0, afterV2: 0 })
    setResetKey((k) => k + 1)
  }

  const pBefore = mass1 * velocity1 + mass2 * velocity2
  const pAfter = collisionData.collided
    ? mass1 * collisionData.afterV1 + mass2 * collisionData.afterV2
    : pBefore

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT: Big 3D screen ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas
          shadows
          camera={{ position: [0, 4, 10], fov: 50 }}
          style={{ background: '#050510' }}
        >
          <Suspense fallback={null}>
            <Scene
              key={resetKey}
              mass1={mass1}
              mass2={mass2}
              velocity1={velocity1}
              velocity2={velocity2}
              elastic={elastic}
              resetKey={resetKey}
              onCollision={setCollisionData}
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
            label="Mass 1"
            value={mass1}
            onChange={setMass1}
            min={1}
            max={20}
            step={0.5}
            unit="kg"
          />
          <ControlSlider
            label="Mass 2"
            value={mass2}
            onChange={setMass2}
            min={1}
            max={20}
            step={0.5}
            unit="kg"
          />
          <ControlSlider
            label="Velocity 1"
            value={velocity1}
            onChange={setVelocity1}
            min={-15}
            max={15}
            step={0.5}
            unit="m/s"
          />
          <ControlSlider
            label="Velocity 2"
            value={velocity2}
            onChange={setVelocity2}
            min={-15}
            max={15}
            step={0.5}
            unit="m/s"
          />
          <ControlButton
            label={elastic ? '● ELASTIC' : '● INELASTIC'}
            onClick={() => setElastic(!elastic)}
            color={elastic ? '#00d4ff' : '#ff6b6b'}
            variant="outline"
          />
          <ControlButton label="RESET" onClick={handleReset} />
        </div>

        {/* MATH OUTPUT PANEL - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader
            label="Mathematical Representation"
            icon="∫"
          />
          <div className="space-y-2">
            <MathBox
              title="Initial Momentum"
              formula="p = m₁v₁ + m₂v₂"
              substitution={`= ${mass1}×${velocity1} + ${mass2}×${velocity2}`}
              result={`p = ${pBefore.toFixed(1)} kg·m/s`}
              color="#a78bfa"
            />
            <MathBox
              title="Conservation Law"
              formula="p_initial = p_final"
              substitution="Momentum is conserved in all collisions"
              result={
                collisionData.collided
                  ? `✓ p_after = ${pAfter.toFixed(1)} kg·m/s`
                  : 'Awaiting collision...'
              }
              color="#34d399"
            />
            <MathDivider />
            {elastic ? (
              <>
                <MathBox
                  title="Elastic: v₁'"
                  formula="v₁' = ((m₁−m₂)v₁ + 2m₂v₂) / (m₁+m₂)"
                  substitution={`= ((${mass1}−${mass2})×${velocity1} + 2×${mass2}×${velocity2}) / (${mass1}+${mass2})`}
                  result={
                    collisionData.collided
                      ? `v₁' = ${collisionData.afterV1.toFixed(2)} m/s`
                      : '—'
                  }
                  color="#00d4ff"
                />
                <MathBox
                  title="Elastic: v₂'"
                  formula="v₂' = ((m₂−m₁)v₂ + 2m₁v₁) / (m₁+m₂)"
                  substitution={`= ((${mass2}−${mass1})×${velocity2} + 2×${mass1}×${velocity1}) / (${mass1}+${mass2})`}
                  result={
                    collisionData.collided
                      ? `v₂' = ${collisionData.afterV2.toFixed(2)} m/s`
                      : '—'
                  }
                  color="#00d4ff"
                />
              </>
            ) : (
              <MathBox
                title="Perfectly Inelastic"
                formula="vf = (m₁v₁ + m₂v₂) / (m₁+m₂)"
                substitution={`= (${mass1}×${velocity1} + ${mass2}×${velocity2}) / (${mass1}+${mass2})`}
                result={
                  collisionData.collided
                    ? `vf = ${collisionData.afterV1.toFixed(2)} m/s`
                    : '—'
                }
                color="#ff6b6b"
              />
            )}
            {collisionData.collided && (
              <>
                <MathDivider />
                <MathBox
                  title="Before Collision"
                  formula={`p = ${mass1}×${velocity1} + ${mass2}×${velocity2}`}
                  result={`p_before = ${pBefore.toFixed(1)} kg·m/s`}
                  color="#fbbf24"
                />
                <MathBox
                  title="After Collision"
                  formula={`p = ${mass1}×${collisionData.afterV1.toFixed(2)} + ${mass2}×${collisionData.afterV2.toFixed(2)}`}
                  result={`p_after = ${pAfter.toFixed(1)} kg·m/s`}
                  color="#fb923c"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
