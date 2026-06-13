'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

function LightScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'light';
  const p = params[topicId] || {};

  const angleOfIncidence = p.angleOfIncidence ?? 30;
  const n1 = p.n1 ?? 1;
  const n2 = p.n2 ?? 1.5;

  const rayLen = 4;

  // Physics calculations based on target angle
  const angleRad = (angleOfIncidence * Math.PI) / 180;
  const sinRefracted = (n1 * Math.sin(angleRad)) / n2;
  const isTIR = Math.abs(sinRefracted) > 1;
  const angleRefraction = isTIR
    ? 90
    : Math.asin(Math.min(1, Math.max(-1, sinRefracted))) * (180 / Math.PI);
  const refractionRad = (angleRefraction * Math.PI) / 180;

  // Light source position (computed from target angle)
  const lightX = -rayLen * Math.sin(angleRad);
  const lightY = rayLen * Math.cos(angleRad);

  // Ref for smooth light source position animation
  const lightSourceRef = useRef<THREE.Group>(null);
  const lightPosRef = useRef({ x: lightX, y: lightY });

  // Animate light source position smoothly when playing
  useFrame((_, delta) => {
    if (!isPlaying) return;
    const speed = Math.min(delta * 4, 1);
    lightPosRef.current.x += (lightX - lightPosRef.current.x) * speed;
    lightPosRef.current.y += (lightY - lightPosRef.current.y) * speed;
    if (lightSourceRef.current) {
      lightSourceRef.current.position.x = lightPosRef.current.x;
      lightSourceRef.current.position.y = lightPosRef.current.y;
    }
  });

  // Incident ray: from upper-left to origin
  const incidentLine: [number, number, number][] = useMemo(() => [
    [lightX, lightY, 0],
    [0, 0, 0],
  ], [lightX, lightY]);

  // Reflected ray: bounces to upper-right (same angle, other side of normal)
  const reflectedLine: [number, number, number][] = useMemo(() => [
    [0, 0, 0],
    [rayLen * Math.sin(angleRad), rayLen * Math.cos(angleRad), 0],
  ], [angleRad]);

  // Refracted ray: bends into denser medium below
  const refractedLine: [number, number, number][] = useMemo(() => {
    if (isTIR) return [[0, 0, 0], [0, 0, 0]];
    return [
      [0, 0, 0],
      [rayLen * Math.sin(refractionRad), -rayLen * Math.cos(refractionRad), 0],
    ];
  }, [refractionRad, isTIR]);

  // Normal line (dashed vertical)
  const normalLine: [number, number, number][] = [
    [0, -3.5, 0],
    [0, 3.5, 0],
  ];

  // Arc for incident angle
  const incidentArc: [number, number, number][] = useMemo(() => {
    const points: [number, number, number][] = [];
    const steps = 20;
    const arcR = 1.0;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * angleRad;
      points.push([arcR * Math.sin(a), arcR * Math.cos(a), 0]);
    }
    return points;
  }, [angleRad]);

  // Arc for reflected angle
  const reflectedArc: [number, number, number][] = useMemo(() => {
    const points: [number, number, number][] = [];
    const steps = 20;
    const arcR = 1.0;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * angleRad;
      points.push([-arcR * Math.sin(a), arcR * Math.cos(a), 0]);
    }
    return points;
  }, [angleRad]);

  // Arc for refracted angle
  const refractedArc: [number, number, number][] = useMemo(() => {
    if (isTIR) return [];
    const points: [number, number, number][] = [];
    const steps = 20;
    const arcR = 1.0;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * refractionRad;
      points.push([arcR * Math.sin(a), -arcR * Math.cos(a), 0]);
    }
    return points;
  }, [refractionRad, isTIR]);

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0, -0.3]}>
        {/* Upper medium (less dense - air) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]}>
          <planeGeometry args={[10, 4]} />
          <meshStandardMaterial
            color="#fef9c3"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Lower medium (denser - glass slab) */}
        <mesh position={[0, -2.25, 0]}>
          <boxGeometry args={[10, 4.5, 0.3]} />
          <meshPhysicalMaterial
            color="#7dd3fc"
            transparent
            opacity={0.3}
            roughness={0.05}
            metalness={0.1}
            transmission={0.6}
            thickness={0.8}
          />
        </mesh>

        {/* Interface line between media */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.01]}>
          <planeGeometry args={[10, 0.03]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
        </mesh>

        {/* Normal (dashed) */}
        <Line points={normalLine} color="#64748b" lineWidth={1.5} dashed dashSize={0.15} gapSize={0.1} />

        {/* Incident ray - yellow */}
        <Line points={incidentLine} color="#facc15" lineWidth={3} />

        {/* Reflected ray - green */}
        <Line points={reflectedLine} color="#4ade80" lineWidth={3} />

        {/* Refracted ray - blue (only when no TIR) */}
        {!isTIR && (
          <Line points={refractedLine} color="#60a5fa" lineWidth={3} />
        )}

        {/* Angle arcs */}
        <Line points={incidentArc} color="#facc15" lineWidth={1} />
        <Line points={reflectedArc} color="#4ade80" lineWidth={1} />
        {!isTIR && refractedArc.length > 1 && (
          <Line points={refractedArc} color="#60a5fa" lineWidth={1} />
        )}

        {/* Light source indicator (animated position) */}
        <group ref={lightSourceRef} position={[lightX, lightY, -0.1]}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} />
          </mesh>
          <pointLight color="#facc15" intensity={0.5} distance={3} />
        </group>

        {/* 3D Labels */}
        {/* Incident angle */}
        <Html position={[0.8 * Math.sin(angleRad / 2), 0.8 * Math.cos(angleRad / 2) + 0.3, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-yellow-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
            {'\u03B8\u1D62'}={angleOfIncidence}&deg;
          </div>
        </Html>

        {/* Reflected angle */}
        <Html position={[-0.8 * Math.sin(angleRad / 2), 0.8 * Math.cos(angleRad / 2) + 0.3, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-green-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
            {'\u03B8\u1D63'}={angleOfIncidence}&deg;
          </div>
        </Html>

        {/* Refracted angle */}
        {!isTIR && (
          <Html position={[0.8 * Math.sin(refractionRad / 2) + 0.2, -0.8 * Math.cos(refractionRad / 2) - 0.3, 0]} center>
            <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-blue-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
              {'\u03B8\u209C'}={angleRefraction.toFixed(1)}&deg;
            </div>
          </Html>
        )}

        {/* Medium labels */}
        <Html position={[4.5, 1.5, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-yellow-100/80 px-2 py-1 text-xs font-bold text-yellow-800 shadow-lg border border-yellow-300">
            n1={n1} (Air)
          </div>
        </Html>

        <Html position={[4.5, -1.5, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-blue-100/80 px-2 py-1 text-xs font-bold text-blue-800 shadow-lg border border-blue-300">
            n2={n2} (Glass)
          </div>
        </Html>

        {/* TIR indicator */}
        <Html position={[0, -3.5, 0]} center>
          <div className={`pointer-events-none select-none whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-lg ${isTIR ? 'bg-red-500 animate-pulse' : 'bg-emerald-600/70'}`}>
            {isTIR ? 'Total Internal Reflection!' : 'Normal Refraction'}
          </div>
        </Html>

        {/* Legend */}
        <Html position={[-4.5, 3.2, 0]} center>
          <div className="pointer-events-none select-none rounded-md bg-gray-800/80 px-3 py-2 text-[10px] text-white shadow-lg space-y-1">
            <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> Incident</div>
            <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-400" /> Reflected</div>
            <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" /> Refracted</div>
          </div>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0, -0.3]} />
    </>
  );
}

export default function LightSimulation() {
  const { params } = useLabStore();
  const topicId = 'light';
  const p = params[topicId] || {};

  const angleOfIncidence = p.angleOfIncidence ?? 30;
  const n1 = p.n1 ?? 1;
  const n2 = p.n2 ?? 1.5;
  const angleRad = (angleOfIncidence * Math.PI) / 180;
  const sinRefracted = (n1 * Math.sin(angleRad)) / n2;
  const totalInternalReflection = Math.abs(sinRefracted) > 1;
  const angleOfRefraction = !totalInternalReflection
    ? (Math.asin(sinRefracted) * (180 / Math.PI)).toFixed(1)
    : 'TIR';

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: "Snell's Law", expression: `n1*sin(t1) = n2*sin(t2)` },
        { name: 'Refraction', expression: `t2 = ${angleOfRefraction} deg` },
      ]}
      liveValues={[
        { label: 't1', value: String(angleOfIncidence), unit: 'deg' },
        { label: 't2', value: String(angleOfRefraction), unit: 'deg' },
        { label: 'TIR', value: totalInternalReflection ? 'Yes' : 'No', unit: '' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <LightScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
