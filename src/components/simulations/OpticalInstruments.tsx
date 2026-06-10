'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Settings } from 'lucide-react'
import { EnhancedLighting, EnhancedGround } from './shared/EnhancedLighting'
import { ControlSlider } from './shared/ControlSlider'
import { MathBox, MathSectionHeader, MathDivider } from './shared/MathBox'

function LensShape() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 5, 16]} />
        <meshStandardMaterial color="#88bbff" transparent opacity={0.3} metalness={0.3} roughness={0.2} emissive="#88bbff" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#88bbff" transparent opacity={0.2} metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0, -2.4, 0]} rotation={[0, 0, Math.PI]}>
        <sphereGeometry args={[0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#88bbff" transparent opacity={0.2} metalness={0.3} roughness={0.2} />
      </mesh>
      <Text position={[0.4, 2.8, 0]} fontSize={0.15} color="#88bbff">
        Lens
      </Text>
    </group>
  )
}

function Ray1({ objectX, objectHeight, focalLength }: { objectX: number; objectHeight: number; focalLength: number }) {
  const endX = Math.min(focalLength * 2, 10)
  const slope = objectHeight / focalLength
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([objectX, objectHeight, 0, 0, objectHeight, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffff00" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, objectHeight, 0, endX, objectHeight - slope * endX, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffff00" />
      </line>
    </group>
  )
}

function Ray2({ objectX, objectHeight }: { objectX: number; objectHeight: number }) {
  const slope = objectHeight / objectX
  const endX = 10
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([objectX, objectHeight, 0, endX, objectHeight + slope * (endX - objectX), 0])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ff88" />
    </line>
  )
}

function Ray3({ objectX, objectHeight, focalLength }: { objectX: number; objectHeight: number; focalLength: number }) {
  const slopeToCenter = objectHeight / (objectX + focalLength)
  const yAtLens = slopeToCenter * (-focalLength - objectX) + objectHeight
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([objectX, objectHeight, 0, 0, yAtLens, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff88ff" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, yAtLens, 0, 10, yAtLens, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff88ff" />
      </line>
    </group>
  )
}

function Scene({ objectDistance, focalLength }: { objectDistance: number; focalLength: number }) {
  const u = objectDistance
  const f = focalLength

  const invV = 1 / f - 1 / u
  const isReal = invV > 0
  const v = 1 / invV
  const magnification = -v / u
  const imageHeight = magnification * 2

  const objectX = -u
  const imageX = v

  const objectHeight = 2

  return (
    <>
      <EnhancedLighting variant="lab" />
      <OrbitControls makeDefault />

      <EnhancedGround width={30} depth={10} y={-3} />

      {/* Principal axis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[24, 0.02, 0.02]} />
        <meshStandardMaterial color="#555" emissive="#555" emissiveIntensity={0.1} />
      </mesh>

      {/* Lens */}
      <LensShape />

      {/* Focal points */}
      <mesh position={[-f, 0, 0]} castShadow>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.4} metalness={0.3} roughness={0.3} />
      </mesh>
      <Text position={[-f, -0.4, 0]} fontSize={0.15} color="#ff4444">
        F
      </Text>
      <mesh position={[f, 0, 0]} castShadow>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.4} metalness={0.3} roughness={0.3} />
      </mesh>
      <Text position={[f, -0.4, 0]} fontSize={0.15} color="#ff4444">
        {"F'"}
      </Text>

      {/* 2F points */}
      <mesh position={[-2 * f, 0, 0]} castShadow>
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
      </mesh>
      <Text position={[-2 * f, -0.4, 0]} fontSize={0.12} color="#ff8844">
        2F
      </Text>
      <mesh position={[2 * f, 0, 0]} castShadow>
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
      </mesh>
      <Text position={[2 * f, -0.4, 0]} fontSize={0.12} color="#ff8844">
        {"2F'"}
      </Text>

      {/* Object (arrow) */}
      <group position={[objectX, 0, 0]}>
        <mesh position={[0, objectHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, objectHeight, 16]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0, objectHeight + 0.15, 0]} castShadow>
          <coneGeometry args={[0.15, 0.3, 16]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
        </mesh>
        <Text position={[0, objectHeight + 0.5, 0]} fontSize={0.15} color="#00d4ff">
          Object
        </Text>
      </group>

      {/* Ray 1: Parallel to axis, refracts through F' */}
      <Ray1 objectX={objectX} objectHeight={objectHeight} focalLength={f} />

      {/* Ray 2: Through center (undeviated) */}
      <Ray2 objectX={objectX} objectHeight={objectHeight} />

      {/* Ray 3: Through F, refracts parallel */}
      <Ray3 objectX={objectX} objectHeight={objectHeight} focalLength={f} />

      {/* Image */}
      {isReal && (
        <group position={[imageX, 0, 0]}>
          <mesh position={[0, imageHeight / 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, Math.abs(imageHeight), 16]} />
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
          </mesh>
          {imageHeight > 0 ? (
            <mesh position={[0, Math.abs(imageHeight) + 0.15, 0]} castShadow>
              <coneGeometry args={[0.15, 0.3, 16]} />
              <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
            </mesh>
          ) : (
            <mesh position={[0, -Math.abs(imageHeight) - 0.15, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[0.15, 0.3, 16]} />
              <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
            </mesh>
          )}
          <Text position={[0, imageHeight > 0 ? Math.abs(imageHeight) + 0.5 : -Math.abs(imageHeight) - 0.5, 0]} fontSize={0.15} color="#00ff88">
            Image (Real)
          </Text>
        </group>
      )}

      {!isReal && (
        <group position={[imageX, 0, 0]}>
          <mesh position={[0, imageHeight / 2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, Math.abs(imageHeight), 16]} />
            <meshStandardMaterial color="#ff88ff" transparent opacity={0.5} emissive="#ff88ff" emissiveIntensity={0.3} metalness={0.3} roughness={0.3} />
          </mesh>
          <Text position={[0, Math.abs(imageHeight) + 0.5, 0]} fontSize={0.15} color="#ff88ff">
            Image (Virtual)
          </Text>
        </group>
      )}
    </>
  )
}

export default function OpticalInstruments() {
  const [objectDistance, setObjectDistance] = useState(8)
  const [focalLength, setFocalLength] = useState(4)

  const u = objectDistance
  const f = focalLength
  const invV = 1 / f - 1 / u
  const isReal = invV > 0
  const v = 1 / invV
  const magnification = -v / u
  const imageType = isReal ? 'Real' : 'Virtual'
  const imageOrientation = magnification > 0 ? 'Upright' : 'Inverted'
  const imageMagnification = Math.abs(magnification) > 1 ? 'Magnified' : Math.abs(magnification) < 1 ? 'Diminished' : 'Same size'

  return (
    <div className="flex flex-col h-full bg-[#050510] max-h-full">
      {/* ====== VIEWPORT ====== */}
      <div className="relative flex-[2] sm:flex-[3] min-h-[240px] sm:min-h-0 border-b border-white/10 shrink-0">
        <Canvas shadows camera={{ position: [0, 3, 14], fov: 50 }} style={{ background: '#050510' }}>
          <Suspense fallback={null}>
            <Scene objectDistance={objectDistance} focalLength={focalLength} />
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
          <ControlSlider label="Object Distance" value={objectDistance} onChange={setObjectDistance} min={3} max={20} step={0.5} unit="cm" color="#00d4ff" />
          <ControlSlider label="Focal Length" value={focalLength} onChange={setFocalLength} min={1} max={8} step={0.5} unit="cm" color="#00d4ff" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Image Distance</p>
              <p className="text-sm font-mono font-bold text-[#00ff88]">{v.toFixed(2)} cm</p>
            </div>
            <div className="rounded-lg p-2 bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Magnification</p>
              <p className="text-sm font-mono font-bold text-[#ffaa00]">{magnification.toFixed(2)}x</p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-yellow-400 rounded" />
              <span className="text-[10px] text-gray-400">Ray 1: Parallel then through F&apos;</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-green-400 rounded" />
              <span className="text-[10px] text-gray-400">Ray 2: Through center (undeviated)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-pink-400 rounded" />
              <span className="text-[10px] text-gray-400">Ray 3: Through F then parallel</span>
            </div>
          </div>
        </div>

        {/* MATH - RIGHT */}
        <div className="w-full sm:w-[45%] p-3 sm:p-4 bg-[#080814] safe-bottom">
          <MathSectionHeader label="Mathematical Representation" icon="\u222B" />
          <div className="space-y-2">
            <MathBox
              title="Lens Formula"
              formula="1/f = 1/v - 1/u"
              substitution={`1/${f} = 1/v - 1/(-${u})`}
              result={`1/v = 1/${f} + 1/${u}`}
              color="#00d4ff"
            />
            <MathBox
              title="Image Distance"
              formula={`v = ${v.toFixed(2)} cm`}
              substitution={`v = ${isReal ? 'positive (real)' : 'negative (virtual)'}`}
              result={`Image at ${Math.abs(v).toFixed(2)} cm ${isReal ? 'on opposite side' : 'on same side'}`}
              color="#00ff88"
            />
            <MathDivider />
            <MathBox
              title="Magnification"
              formula="m = -v / u"
              substitution={`-${v.toFixed(2)} / (-${u})`}
              result={`m = ${magnification.toFixed(2)}`}
              color="#ffaa00"
            />
            <MathBox
              title="Image Type"
              formula={`Type: ${imageType}`}
              substitution={`v ${isReal ? '> 0' : '< 0'} \u2192 ${isReal ? 'Real image' : 'Virtual image'}`}
              result={imageType}
              color="#ff88ff"
            />
            <MathBox
              title="Image Orientation"
              formula={`Orientation: ${imageOrientation}`}
              substitution={`m ${magnification > 0 ? '> 0' : '< 0'} \u2192 ${magnification > 0 ? 'Upright' : 'Inverted'}`}
              result={imageOrientation}
              color="#a78bfa"
            />
            <MathBox
              title="Image Size"
              formula={`|m| ${Math.abs(magnification) > 1 ? '> 1' : Math.abs(magnification) < 1 ? '< 1' : '= 1'}`}
              result={imageMagnification}
              color="#ff6b6b"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
