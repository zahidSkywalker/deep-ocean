'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function AngleArcHelper({
  angle,
  centerY,
  side,
  color,
}: {
  angle: number
  centerY: number
  side: 'upper' | 'lower'
  color: string
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 16
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * angle
      if (side === 'upper') {
        pts.push(new THREE.Vector3(-Math.sin(a) * 1, Math.cos(a) * 1 + centerY, 0))
      } else {
        pts.push(new THREE.Vector3(Math.sin(a) * 1, -Math.cos(a) * 1 + centerY, 0))
      }
    }
    return pts
  }, [angle, centerY, side])

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
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  )
}

function Scene({ incidentAngle, refractiveIndex }: { incidentAngle: number; refractiveIndex: number }) {
  const theta1 = (incidentAngle * Math.PI) / 180
  const n1 = 1.0
  const n2 = refractiveIndex

  const sinTheta2 = (n1 * Math.sin(theta1)) / n2
  const isTotalInternal = sinTheta2 > 1
  const theta2 = isTotalInternal ? Math.PI / 2 : Math.asin(sinTheta2)

  const rayLen = 6
  const slabThickness = 3

  const incStart: [number, number, number] = [
    -rayLen * Math.sin(theta1),
    rayLen * Math.cos(theta1),
    0,
  ]
  const incEnd: [number, number, number] = [0, 0, 0]

  let refEnd: [number, number, number]
  if (!isTotalInternal) {
    refEnd = [
      rayLen * Math.sin(theta2),
      -rayLen * Math.cos(theta2),
      0,
    ]
  } else {
    refEnd = [0, 0, 0]
  }

  const theta2Deg = isTotalInternal ? 90 : (theta2 * 180) / Math.PI

  // Total internal reflection reflected ray
  const tirReflectedEnd: [number, number, number] = isTotalInternal
    ? [rayLen * Math.sin(theta1), rayLen * Math.cos(theta1), 0]
    : [0, 0, 0]

  return (
    <>
      <EnhancedLighting variant="lab" />
      <OrbitControls makeDefault />

      <EnhancedGround width={20} depth={10} y={-5} />

      {/* Upper medium (air) */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[12, 6, 3]} />
        <meshStandardMaterial color="#111122" transparent opacity={0.3} metalness={0.1} roughness={0.4} />
      </mesh>
      <Text position={[-5, 5, 0]} fontSize={0.2} color="#888">
        {'Air (n\u2081 = 1.0)'}
      </Text>

      {/* Lower medium (glass/water) */}
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[12, slabThickness, 3]} />
        <meshStandardMaterial color="#223366" transparent opacity={0.4} metalness={0.2} roughness={0.3} emissive="#223366" emissiveIntensity={0.1} />
      </mesh>
      <Text position={[-5, -3.5, 0]} fontSize={0.2} color="#6688cc">
        {`Medium (n\u2082 = ${refractiveIndex})`}
      </Text>

      {/* Interface line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[12, 0.04, 3]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* Normal line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -4, 0, 0, 4, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </line>
      <Text position={[0.2, 3.5, 0]} fontSize={0.13} color="#888">
        Normal
      </Text>

      {/* Incident ray */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([incStart[0], incStart[1], incStart[2], incEnd[0], incEnd[1], incEnd[2]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffff00" linewidth={2} />
      </line>

      {/* Refracted ray */}
      {!isTotalInternal && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, refEnd[0], refEnd[1], refEnd[2]])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff88" linewidth={2} />
        </line>
      )}

      {/* TIR reflected ray */}
      {isTotalInternal && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, tirReflectedEnd[0], tirReflectedEnd[1], tirReflectedEnd[2]])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff4444" linewidth={2} />
        </line>
      )}

      {/* Angle arcs */}
      <AngleArcHelper angle={theta1} centerY={0} side="upper" color="#ffff00" />
      {!isTotalInternal && (
        <AngleArcHelper angle={theta2} centerY={0} side="lower" color="#00ff88" />
      )}

      {/* Angle labels */}
      <Text position={[-1.2, 1.2, 0]} fontSize={0.15} color="#ffff00">
        {`\u03B8\u2081 = ${incidentAngle}\u00B0`}
      </Text>
      {!isTotalInternal && (
        <Text position={[1.2, -1.2, 0]} fontSize={0.15} color="#00ff88">
          {`\u03B8\u2082 = ${theta2Deg.toFixed(1)}\u00B0`}
        </Text>
      )}

      {/* TIR indicator */}
      {isTotalInternal && (
        <Text position={[3, 2, 0]} fontSize={0.25} color="#ff4444">
          TOTAL INTERNAL REFLECTION
        </Text>
      )}
    </>
  )
}

export default function Refraction() {
  const [incidentAngle, setIncidentAngle] = useState(30)
  const [refractiveIndex, setRefractiveIndex] = useState(1.5)

  const n1 = 1.0
  const n2 = refractiveIndex
  const theta1 = (incidentAngle * Math.PI) / 180
  const sinTheta2 = (n1 * Math.sin(theta1)) / n2
  const isTotalInternal = sinTheta2 > 1
  const theta2 = isTotalInternal ? Math.PI / 2 : Math.asin(sinTheta2)
  const theta2Deg = isTotalInternal ? 90 : (theta2 * 180) / Math.PI
  const criticalAngleDeg = n2 > n1 ? Math.asin(n1 / n2) * (180 / Math.PI) : null

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 2, 10], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene incidentAngle={incidentAngle} refractiveIndex={refractiveIndex} />
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
          <ControlSlider label="Incident Angle" value={incidentAngle} onChange={setIncidentAngle} min={0} max={89} step={1} unit="\u00B0" color="#00d4ff" />
          <ControlSlider label="Refractive Index" value={refractiveIndex} onChange={setRefractiveIndex} min={1} max={2.5} step={0.1} color="#00d4ff" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Refracted Angle</p>
              <p className="text-sm font-mono font-bold text-[#00ff88]">{isTotalInternal ? 'N/A (TIR)' : `${theta2Deg.toFixed(1)}\u00B0`}</p>
            </div>
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Critical Angle</p>
              <p className="text-sm font-mono font-bold text-[#ffaa00]">{criticalAngleDeg !== null ? `${criticalAngleDeg.toFixed(1)}\u00B0` : 'N/A'}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-yellow-400 rounded" />
              <span className="text-[10px] text-gray-400">Incident ray</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-green-400 rounded" />
              <span className="text-[10px] text-gray-400">Refracted ray</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-red-400 rounded" />
              <span className="text-[10px] text-gray-400">TIR reflected ray</span>
            </div>
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="\u222B" />
          <div className="space-y-2">
            <MathBox
              title="Snell's Law"
              formula="n\u2081\u00B7sin(\u03B8\u2081) = n\u2082\u00B7sin(\u03B8\u2082)"
              substitution={`n\u2081=${n1}, n\u2082=${n2}`}
              color="#00d4ff"
            />
            <MathBox
              title="Calculation"
              formula={`sin(\u03B8\u2082) = (n\u2081/n\u2082)\u00B7sin(\u03B8\u2081)`}
              substitution={`(${n1}/${n2})\u00B7sin(${incidentAngle}\u00B0)`}
              result={`sin(\u03B8\u2082) = ${sinTheta2.toFixed(4)}`}
              color="#00ff88"
            />
            <MathBox
              title="Refracted Angle"
              formula={`\u03B8\u2082 = arcsin(${sinTheta2.toFixed(4)})`}
              result={isTotalInternal ? 'TIR occurs (sin > 1)' : `\u03B8\u2082 = ${theta2Deg.toFixed(1)}\u00B0`}
              color="#ffff00"
            />
            <MathDivider />
            {criticalAngleDeg !== null && (
              <MathBox
                title="Critical Angle"
                formula="\u03B8_c = arcsin(n\u2081/n\u2082)"
                substitution={`arcsin(${n1}/${n2})`}
                result={`\u03B8_c = ${criticalAngleDeg.toFixed(1)}\u00B0`}
                color="#ffaa00"
              />
            )}
            {criticalAngleDeg === null && (
              <MathBox
                title="Critical Angle"
                formula="N/A when n\u2082 \u2264 n\u2081"
                substitution="Critical angle only exists when light goes from denser to rarer medium"
                color="#ffaa00"
              />
            )}
            <MathBox
              title="Total Internal Reflection"
              formula={isTotalInternal ? `\u03B8\u2081 (${incidentAngle}\u00B0) > \u03B8_c (${criticalAngleDeg !== null ? `${criticalAngleDeg.toFixed(1)}\u00B0` : 'N/A'})` : `\u03B8\u2081 (${incidentAngle}\u00B0) \u2264 \u03B8_c`}
              result={isTotalInternal ? 'TOTAL INTERNAL REFLECTION OCCURRING' : 'No TIR - light refracts'}
              color={isTotalInternal ? '#ff4444' : '#00ff88'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
