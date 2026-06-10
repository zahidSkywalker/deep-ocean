'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useState, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function AngleArc({
  angle,
  offsetY,
  side,
}: {
  angle: number
  offsetY: number
  side: 'left' | 'right'
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 16
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * angle
      if (side === 'left') {
        pts.push(new THREE.Vector3(-Math.cos(Math.PI - a) * 0.8, offsetY + Math.sin(a) * 0.8, 0))
      } else {
        pts.push(new THREE.Vector3(-Math.cos(Math.PI + a) * 0.8, offsetY + Math.sin(a) * 0.8, 0))
      }
    }
    return pts
  }, [angle, offsetY, side])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={side === 'left' ? '#ffff00' : '#00ff88'} transparent opacity={0.6} />
    </line>
  )
}

function Scene({ incidentAngle, rayCount }: { incidentAngle: number; rayCount: number }) {
  const rad = (incidentAngle * Math.PI) / 180
  const rayLength = 8

  const rays = []
  for (let i = 0; i < rayCount; i++) {
    const offsetY = (i - (rayCount - 1) / 2) * 1.5

    const incStart: [number, number, number] = [
      -rayLength * Math.cos(rad),
      offsetY + rayLength * Math.sin(rad),
      0,
    ]
    const incEnd: [number, number, number] = [0, offsetY, 0]

    const refStart: [number, number, number] = [0, offsetY, 0]
    const refEnd: [number, number, number] = [
      -rayLength * Math.cos(rad),
      offsetY + rayLength * Math.sin(rad),
      0,
    ]

    rays.push({ incStart, incEnd, refStart, refEnd, offsetY })
  }

  return (
    <>
      <EnhancedLighting variant="lab" />
      <OrbitControls makeDefault />

      <EnhancedGround width={20} depth={10} y={-3} />

      {/* Mirror */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[0.15, 8, 2]} />
        <meshStandardMaterial color="#aaccff" metalness={0.9} roughness={0.1} emissive="#aaccff" emissiveIntensity={0.05} />
      </mesh>
      <Text position={[0, 4.3, 0]} fontSize={0.2} color="#aaccff">
        Mirror
      </Text>

      {/* Rays */}
      {rays.map((ray, i) => (
        <group key={i}>
          {/* Incident ray */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  ray.incStart[0], ray.incStart[1], ray.incStart[2],
                  ray.incEnd[0], ray.incEnd[1], ray.incEnd[2],
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffff00" linewidth={2} />
          </line>

          {/* Arrow head for incident ray */}
          <mesh
            position={[
              ray.incStart[0] * 0.6,
              ray.incStart[1] * 0.6 + ray.offsetY * 0.4,
              0,
            ]}
            rotation={[0, 0, -rad + Math.PI / 2]}
          >
            <coneGeometry args={[0.08, 0.25, 16]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.4} metalness={0.3} roughness={0.3} />
          </mesh>

          {/* Reflected ray */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  ray.refStart[0], ray.refStart[1], ray.refStart[2],
                  ray.refEnd[0], ray.refEnd[1], ray.refEnd[2],
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#00ff88" linewidth={2} />
          </line>

          {/* Normal line */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, ray.offsetY - 2, 0, 0, ray.offsetY + 2, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" linewidth={1} transparent opacity={0.4} />
          </line>

          {/* Angle arc for incidence */}
          <AngleArc angle={rad} offsetY={ray.offsetY} side="left" />

          {/* Angle arc for reflection */}
          <AngleArc angle={rad} offsetY={ray.offsetY} side="right" />
        </group>
      ))}
    </>
  )
}

export default function LightReflection() {
  const [incidentAngle, setIncidentAngle] = useState(45)
  const [rayCount, setRayCount] = useState(3)

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 2, 10], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene incidentAngle={incidentAngle} rayCount={rayCount} />
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
          <ControlSlider label="Incident Angle" value={incidentAngle} onChange={setIncidentAngle} min={0} max={85} step={1} unit="\u00B0" color="#00d4ff" />
          <ControlSlider label="Ray Count" value={rayCount} onChange={setRayCount} min={1} max={5} step={1} color="#00d4ff" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Incident Angle</p>
              <p className="text-sm font-mono font-bold text-[#ffff00]">{incidentAngle}\u00B0</p>
            </div>
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reflection Angle</p>
              <p className="text-sm font-mono font-bold text-[#00ff88]">{incidentAngle}\u00B0</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-yellow-400 rounded" />
              <span className="text-[10px] text-gray-400">Incident rays</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-green-400 rounded" />
              <span className="text-[10px] text-gray-400">Reflected rays</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-white/40 rounded" />
              <span className="text-[10px] text-gray-400">Normal line</span>
            </div>
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="\u222B" />
          <div className="space-y-2">
            <MathBox
              title="Law of Reflection"
              formula="\u03B8\u1D62 = \u03B8\u1D63"
              result="Angle of incidence equals angle of reflection"
              color="#00d4ff"
            />
            <MathDivider />
            <MathBox
              title="Angle of Incidence"
              formula="\u03B8\u1D62 = {incidentAngle}\u00B0"
              substitution="Measured from the normal to the surface"
              result={`\u03B8\u1D62 = ${incidentAngle}\u00B0`}
              color="#ffff00"
            />
            <MathBox
              title="Angle of Reflection"
              formula="\u03B8\u1D63 = {incidentAngle}\u00B0"
              substitution="Measured from the normal to the surface"
              result={`\u03B8\u1D63 = ${incidentAngle}\u00B0`}
              color="#00ff88"
            />
            <MathDivider />
            <MathBox
              title="Normal"
              formula="Perpendicular to surface"
              substitution="The normal line is perpendicular to the mirror at the point of incidence"
              result="All angles measured from normal"
              color="#a78bfa"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
