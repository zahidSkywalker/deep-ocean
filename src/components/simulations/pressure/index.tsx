'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

function PressureScene() {
  const pistonRef = useRef<THREE.Mesh>(null);
  const piston2Ref = useRef<THREE.Mesh>(null);
  const objectRef = useRef<THREE.Mesh>(null);
  const water1Ref = useRef<THREE.Mesh>(null);
  const water2Ref = useRef<THREE.Mesh>(null);
  const waterSurfaceRef = useRef<THREE.Mesh>(null);

  const pistonYRef = useRef(1.0);
  const pistonPhaseRef = useRef(0);
  const objectYRef = useRef(0.5);
  const objectPhaseRef = useRef(0);
  const timeRef = useRef(0);

  const { params, isPlaying } = useLabStore();
  const topicId = 'pressure';
  const p = params[topicId] || {};

  const area1 = p.area1 ?? 10;
  const force1 = p.force1 ?? 50;
  const objectDensity = p.objectDensity ?? 2700;
  const fluidDensity = p.fluidDensity ?? 1000;

  const pressure = force1 / area1;
  const area2 = area1 * 2;
  const force2 = pressure * area2;
  const willFloat = objectDensity < fluidDensity;

  // Cylinder dimensions
  const cyl1Radius = 0.5;
  const cyl2Radius = 0.7;
  const cylHeight = 2.2;
  const cyl1X = -1.5;
  const cyl2X = 1.5;
  const baseY = -0.2;

  // Water level calculations based on piston position
  // Communicating vessels: equal pressure on both sides
  // Piston 1 pushes down → water rises in cylinder 2
  const pistonMinY = 0.4;
  const pistonMaxY = 1.2;
  const baseWaterLevel = 0.3;

  // Compute water geometry from piston position
  const getWaterLevels = (py: number) => {
    // Piston pushes down, water displaced raises level in both cylinders
    const pistonDisplacement = (pistonMaxY - py) * (cyl1Radius * cyl1Radius);
    const totalBaseArea = Math.PI * (cyl1Radius * cyl1Radius + cyl2Radius * cyl2Radius);
    const waterRise = pistonDisplacement / totalBaseArea;
    const waterLevel = baseWaterLevel + waterRise;
    return {
      water1Top: Math.max(py - 0.08, baseY + 0.01), // water fills up to piston bottom
      water1Height: Math.max(0.01, (py - 0.08) - baseY),
      water2Height: Math.max(0.01, waterLevel - baseY),
      water2Top: baseY + Math.max(0.01, waterLevel - baseY),
    };
  };

  // Bob parameters for floating object
  const bobAmplitude = willFloat ? 0.08 : 0;
  const bobFrequency = 2.0;

  useFrame((state, delta) => {
    if (!isPlaying) return;
    timeRef.current += delta;

    const t = timeRef.current;

    // Smooth piston oscillation (down and back up in a loop)
    const cycle = t * 0.5; // speed of oscillation
    const pistonNorm = (Math.sin(cycle) + 1) / 2; // 0 to 1
    const py = pistonMinY + pistonNorm * (pistonMaxY - pistonMinY);

    pistonYRef.current = py;

    if (pistonRef.current) {
      pistonRef.current.position.y = py;
    }

    // Piston 2 rises as water is pushed
    const levels = getWaterLevels(py);
    if (piston2Ref.current) {
      piston2Ref.current.position.y = levels.water2Top + 0.08;
    }

    // Update water meshes
    if (water1Ref.current) {
      const h = Math.max(0.01, levels.water1Height);
      water1Ref.current.scale.y = h;
      water1Ref.current.position.y = baseY + h / 2;
    }
    if (water2Ref.current) {
      const h = Math.max(0.01, levels.water2Height);
      water2Ref.current.scale.y = h;
      water2Ref.current.position.y = baseY + h / 2;
    }

    // Water surface wave animation
    if (waterSurfaceRef.current) {
      const geo = waterSurfaceRef.current.geometry;
      const pos = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 2] = Math.sin(pos[i] * 4 + t * 3) * 0.015;
      }
      geo.attributes.position.needsUpdate = true;
    }

    // Floating/sinking object
    if (objectRef.current) {
      const waterTop = levels.water2Top;
      if (willFloat) {
        // Bob on water surface
        const bobOffset = Math.sin(t * bobFrequency) * bobAmplitude;
        objectRef.current.position.y = waterTop - 0.15 + bobOffset;
      } else {
        // Sinks slowly
        const sinkProgress = Math.min(1, t * 0.15);
        objectRef.current.position.y = waterTop - 0.3 - sinkProgress * 0.5;
      }
    }
  });

  // Pre-compute initial water levels for positioning
  const initialLevels = getWaterLevels(pistonMaxY);

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0.3, -0.5]}>
        {/* Cylinder 1 - smaller area (transparent glass) */}
        <mesh position={[cyl1X, baseY + cylHeight / 2, 0]}>
          <cylinderGeometry args={[cyl1Radius, cyl1Radius, cylHeight, 32]} />
          <meshPhysicalMaterial
            color="#94a3b8"
            transparent
            opacity={0.2}
            roughness={0.1}
            metalness={0.5}
            transmission={0.6}
            thickness={0.2}
          />
        </mesh>

        {/* Cylinder 2 - larger area (transparent glass) */}
        <mesh position={[cyl2X, baseY + cylHeight / 2, 0]}>
          <cylinderGeometry args={[cyl2Radius, cyl2Radius, cylHeight, 32]} />
          <meshPhysicalMaterial
            color="#94a3b8"
            transparent
            opacity={0.2}
            roughness={0.1}
            metalness={0.5}
            transmission={0.6}
            thickness={0.2}
          />
        </mesh>

        {/* Connecting tube between cylinders at bottom */}
        <mesh position={[0, baseY + 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, cyl2X - cyl1X, 16]} />
          <meshPhysicalMaterial
            color="#94a3b8"
            transparent
            opacity={0.25}
            roughness={0.1}
            metalness={0.5}
            transmission={0.5}
            thickness={0.15}
          />
        </mesh>

        {/* Water inside cylinder 1 (matches cylinder radius) */}
        <mesh ref={water1Ref} position={[cyl1X, baseY + initialLevels.water1Height / 2, 0]}>
          <cylinderGeometry args={[cyl1Radius - 0.02, cyl1Radius - 0.02, 1, 32]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
        </mesh>

        {/* Water inside cylinder 2 (matches cylinder radius) */}
        <mesh ref={water2Ref} position={[cyl2X, baseY + initialLevels.water2Height / 2, 0]}>
          <cylinderGeometry args={[cyl2Radius - 0.02, cyl2Radius - 0.02, 1, 32]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
        </mesh>

        {/* Water surface shimmer on cylinder 2 */}
        <mesh ref={waterSurfaceRef} position={[cyl2X, initialLevels.water2Top, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[cyl2Radius - 0.04, 32, 6]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.5} roughness={0.02} metalness={0.15} />
        </mesh>

        {/* Piston 1 */}
        <mesh ref={pistonRef} position={[cyl1X, pistonMaxY, 0]} castShadow>
          <cylinderGeometry args={[cyl1Radius - 0.03, cyl1Radius - 0.03, 0.12, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Piston 1 rod */}
        <mesh position={[cyl1X, pistonMaxY + 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.85} />
        </mesh>

        {/* Piston 2 (moves up with water) */}
        <mesh ref={piston2Ref} position={[cyl2X, initialLevels.water2Top + 0.08, 0]} castShadow>
          <cylinderGeometry args={[cyl2Radius - 0.03, cyl2Radius - 0.03, 0.12, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Piston 2 rod */}
        <mesh position={[cyl2X, initialLevels.water2Top + 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.85} />
        </mesh>

        {/* Floating/sinking object in cylinder 2 */}
        <mesh ref={objectRef} position={[cyl2X, initialLevels.water2Top - 0.15, 0]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={willFloat ? '#4ade80' : '#ef4444'} roughness={0.3} metalness={0.5} />
        </mesh>

        {/* 3D Labels */}
        {/* Force arrow label - F1 */}
        <Html position={[cyl1X - 0.8, pistonMaxY + 0.3, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-red-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
            F₁={force1}N
          </div>
        </Html>

        {/* Force arrow label - F2 */}
        <Html position={[cyl2X + 1.0, initialLevels.water2Top + 0.4, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-blue-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
            F₂={force2.toFixed(1)}N
          </div>
        </Html>

        {/* Pressure formula label */}
        <Html position={[0, baseY + cylHeight + 0.5, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-emerald-600/80 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            P = F/A = {pressure.toFixed(1)} N/cm²
          </div>
        </Html>

        {/* Density labels */}
        <Html position={[cyl2X, baseY - 0.5, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-700/80 px-2 py-1 text-[10px] text-white shadow-lg">
            ρ_fluid={fluidDensity} kg/m³
          </div>
        </Html>

        {/* Object density label */}
        <Html position={[cyl2X + 0.8, initialLevels.water2Top - 0.15, 0.5]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-700/80 px-2 py-1 text-[10px] text-white shadow-lg">
            ρ_obj={objectDensity} kg/m³
          </div>
        </Html>

        {/* Float/Sink indicator */}
        <Html position={[cyl2X, baseY + cylHeight + 0.1, 0.6]} center>
          <div className={`pointer-events-none select-none whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-lg ${willFloat ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
            {willFloat ? 'FLOATS ✦' : 'SINKS ✦'}
          </div>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0.3, -0.5]} />
    </>
  );
}

export default function PressureSimulation() {
  const { params } = useLabStore();
  const topicId = 'pressure';
  const p = params[topicId] || {};

  const area1 = p.area1 ?? 10;
  const force1 = p.force1 ?? 50;
  const objectDensity = p.objectDensity ?? 2700;
  const fluidDensity = p.fluidDensity ?? 1000;
  const pressureVal = (force1 / area1).toFixed(2);
  const force2Val = (pressureVal * area1 * 2).toFixed(1);
  const willFloat = objectDensity < fluidDensity;

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Pressure', expression: `P = F/A = ${pressureVal} N/cm²` },
        { name: "Pascal's Law", expression: `P₁ = P₂ → F₂ = ${force2Val} N` },
      ]}
      liveValues={[
        { label: 'P', value: pressureVal, unit: 'N/cm²' },
        { label: 'F₂', value: force2Val, unit: 'N' },
        { label: 'Float', value: willFloat ? 'Yes' : 'No', unit: '' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [5, 4, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <PressureScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
