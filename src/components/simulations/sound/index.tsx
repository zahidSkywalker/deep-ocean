'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

// A single air molecule sphere that uses refs for animation
function AirMolecule({
  baseX,
  baseY,
  baseZ,
  radius,
}: {
  baseX: number;
  baseY: number;
  baseZ: number;
  radius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Only animate when playing
    const { isPlaying } = useLabStore.getState();
    if (!isPlaying) return;

    const t = clock.getElapsedTime();
    // Subtle bobbing motion
    meshRef.current.position.y = baseY + Math.sin(t * 2 + baseX * 3) * 0.02;
    meshRef.current.position.x = baseX + Math.sin(t * 1.5 + baseZ * 5) * 0.01;
  });

  return (
    <mesh ref={meshRef} position={[baseX, baseY, baseZ]}>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshStandardMaterial color="#22d3ee" transparent opacity={0.5} roughness={0.2} />
    </mesh>
  );
}

function SoundScene() {
  const groupRef = useRef<THREE.Group>(null);
  const speakerConeRef = useRef<THREE.Mesh>(null);
  const { params, isPlaying } = useLabStore();
  const topicId = 'sound';
  const p = params[topicId] || {};

  const frequency = p.frequency ?? 440;
  const amplitude = p.amplitude ?? 1;
  const speed = p.speed ?? 343;
  const wavelength = speed / frequency;

  // Pre-generate sphere positions and sizes with useMemo (NO Math.random in render!)
  const moleculeData = useMemo(() => {
    const data: { x: number; y: number; z: number; r: number; col: number }[] = [];
    // Use deterministic pseudo-random seeded generator
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    };

    // Create rows of air molecules
    const rows = 30;
    const cols = 5;
    const spacing = 0.35;
    const startX = -3.5;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const baseX = startX + i * spacing;
        const baseY = (j - cols / 2) * 0.3;
        const baseZ = (seededRandom() - 0.5) * 0.15;
        const r = 0.04 + seededRandom() * 0.03;
        data.push({ x: baseX, y: baseY, z: baseZ, r, col: i });
      }
    }
    return data;
  }, []);

  // Separate molecule refs for displacement animation
  const moleculeRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Wave animation using refs - compression and rarefaction
  const waveTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    waveTimeRef.current += delta;

    const t = waveTimeRef.current;
    const waveSpeed = 2.0; // visual speed
    const visualWavelength = 2.0; // visual wavelength in scene units
    const ampScale = amplitude * 0.08; // displacement amplitude

    moleculeRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const data = moleculeData[idx];
      // Displacement based on longitudinal wave equation
      // x_displacement = amplitude * sin(kx - wt)
      const phase = (2 * Math.PI * data.x) / visualWavelength - t * waveSpeed * 2 * Math.PI / visualWavelength;
      const displacement = ampScale * Math.sin(phase);
      mesh.position.x = data.x + displacement;
    });

    // Speaker cone pulsing
    if (speakerConeRef.current) {
      const conePhase = Math.sin(t * frequency * 0.005) * 0.05 * amplitude;
      speakerConeRef.current.position.z = conePhase;
    }
  });

  // Compute compression/rarefaction label positions
  const visualWavelength = 2.0;
  const compressionPositions = useMemo(() => {
    return [-2.5, -0.5, 1.5]; // Positions where compression is maximum
  }, []);

  const rarefactionPositions = useMemo(() => {
    return [-3.5, -1.5, 0.5, 2.5]; // Positions where rarefaction is maximum
  }, []);

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0.5, -0.5]}>
        {/* Metal speaker cabinet */}
        <mesh position={[-5.2, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 2.0, 1.3]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Speaker cone */}
        <mesh ref={speakerConeRef} position={[-4.7, 0, 0]}>
          <circleGeometry args={[0.6, 24]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={isPlaying ? 0.6 : 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Speaker surround ring */}
        <mesh position={[-4.68, 0, 0]}>
          <ringGeometry args={[0.55, 0.65, 24]} />
          <meshStandardMaterial color="#475569" side={THREE.DoubleSide} metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Speaker grille - aligned properly */}
        <group position={[-4.65, 0, 0.02]}>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={`h-${i}`} position={[0, (i - 3) * 0.15, 0]}>
              <boxGeometry args={[1.0, 0.015, 0.01]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} transparent opacity={0.5} />
            </mesh>
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={`v-${i}`} position={[0, (i - 4) * 0.1, 0]}>
              <boxGeometry args={[0.015, 1.0, 0.01]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} transparent opacity={0.5} />
            </mesh>
          ))}
        </group>

        {/* Air molecules - pre-generated positions */}
        {moleculeData.map((data, idx) => (
          <mesh
            key={idx}
            ref={(el) => { moleculeRefs.current[idx] = el; }}
            position={[data.x, data.y, data.z]}
          >
            <sphereGeometry args={[data.r, 8, 8]} />
            <meshStandardMaterial color="#22d3ee" transparent opacity={0.5} roughness={0.2} />
          </mesh>
        ))}

        {/* Compression labels */}
        {compressionPositions.map((pos, i) => (
          <Html key={`comp-${i}`} position={[pos, 1.2, 0.3]} center>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-red-500/70 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              Compression
            </div>
          </Html>
        ))}

        {/* Rarefaction labels */}
        {rarefactionPositions.map((pos, i) => (
          <Html key={`rare-${i}`} position={[pos, -1.2, 0.3]} center>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-blue-500/70 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              Rarefaction
            </div>
          </Html>
        ))}

        {/* Wavelength indicator */}
        <Html position={[0, 1.8, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-purple-500/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
            λ = {(speed / frequency).toFixed(2)} m
          </div>
        </Html>

        {/* Frequency label */}
        <Html position={[0, -1.8, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-emerald-600/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
            f = {frequency} Hz
          </div>
        </Html>

        {/* Amplitude label */}
        <Html position={[-3, 2.2, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-amber-600/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
            A = {amplitude}
          </div>
        </Html>

        {/* Direction arrow */}
        <Html position={[2.5, 0, 0.8]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-700/80 px-2 py-1 text-[10px] font-bold text-white shadow">
            → propagation →
          </div>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[-1, 0.5, -0.5]} />
    </>
  );
}

export default function SoundSimulation() {
  const { params } = useLabStore();
  const topicId = 'sound';
  const p = params[topicId] || {};

  const frequency = p.frequency ?? 440;
  const amplitude = p.amplitude ?? 1;
  const speed = p.speed ?? 343;
  const wavelength = (speed / frequency).toFixed(2);
  const period = (1 / frequency * 1000).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Wave Speed', expression: `v = fλ = ${speed} m/s` },
        { name: 'Wavelength', expression: `λ = v/f = ${wavelength} m` },
      ]}
      liveValues={[
        { label: 'f', value: String(frequency), unit: 'Hz' },
        { label: 'λ', value: wavelength, unit: 'm' },
        { label: 'T', value: period, unit: 'ms' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 2, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <SoundScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
