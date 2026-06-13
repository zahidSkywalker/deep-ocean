'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

// 3D wire segment component with thick, emissive appearance
function WireSegment({
  start,
  end,
  color = '#4ade80',
  thickness = 0.08,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  thickness?: number;
}) {
  const direction = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const length = direction.length();
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  return (
    <mesh position={mid}>
      <boxGeometry args={[
        direction.x !== 0 ? length : thickness,
        direction.y !== 0 ? length : thickness,
        direction.z !== 0 ? length : thickness,
      ]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

// Corner joint for wire connections
function WireJoint({
  position,
  color = '#4ade80',
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

// Electron that follows a path
function Electron({
  pathRef,
  offset,
  color = '#fde047',
}: {
  pathRef: React.RefObject<THREE.Vector3[] | null>;
  offset: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const distRef = useRef(offset);

  useFrame((_, delta) => {
    const { isPlaying } = useLabStore.getState();
    if (!meshRef.current || !pathRef.current) return;
    if (!isPlaying) return;

    const path = pathRef.current;
    if (path.length < 2) return;

    // Compute total path length
    let totalLength = 0;
    const segLengths: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const sl = path[i].distanceTo(path[i + 1]);
      segLengths.push(sl);
      totalLength += sl;
    }

    if (totalLength === 0) return;

    // Speed proportional to current (managed externally via delta scaling)
    distRef.current = (distRef.current + delta * 1.5) % totalLength;

    // Find position along path
    let accumulated = 0;
    for (let i = 0; i < segLengths.length; i++) {
      if (accumulated + segLengths[i] >= distRef.current) {
        const t = (distRef.current - accumulated) / segLengths[i];
        meshRef.current.position.lerpVectors(path[i], path[i + 1], t);
        break;
      }
      accumulated += segLengths[i];
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
      <pointLight color={color} intensity={0.3} distance={0.5} />
    </mesh>
  );
}

// Resistor component
function Resistor({
  position,
  resistance,
  label,
  color = '#f97316',
}: {
  position: [number, number, number];
  resistance: number;
  label: string;
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.25, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Color bands */}
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[0.05, 0.26, 0.01]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0.1, 0, 0.13]}>
        <boxGeometry args={[0.05, 0.26, 0.01]} />
        <meshStandardMaterial color="#a855f7" />
      </mesh>
      <mesh position={[-0.1, 0, 0.13]}>
        <boxGeometry args={[0.05, 0.26, 0.01]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {/* Label */}
      <Html position={[0, 0.3, 0]} center>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-orange-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {label}={resistance}Ω
        </div>
      </Html>
    </group>
  );
}

// Battery component
function Battery({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Battery body */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 1.0, 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Positive terminal */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
        <meshStandardMaterial color="#dc2626" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Negative terminal */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
        <meshStandardMaterial color="#2563eb" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* + label */}
      <Html position={[0, 0.75, 0]} center>
        <div className="pointer-events-none select-none rounded-full bg-red-500/80 px-1.5 py-0.5 text-xs font-bold text-white shadow">
          +
        </div>
      </Html>
      {/* - label */}
      <Html position={[0, -0.75, 0]} center>
        <div className="pointer-events-none select-none rounded-full bg-blue-500/80 px-1.5 py-0.5 text-xs font-bold text-white shadow">
          −
        </div>
      </Html>
      {/* Voltage label */}
      <Html position={[-0.6, 0, 0]} center>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-emerald-600/80 px-2 py-1 text-xs font-bold text-white shadow">
          V=12V
        </div>
      </Html>
    </group>
  );
}

// 3D Breadboard base
function Breadboard() {
  return (
    <group position={[0, -0.15, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[7, 0.15, 3]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.8} metalness={0.0} />
      </mesh>
      {/* Holes pattern */}
      {Array.from({ length: 8 }).map((_, i) => (
        Array.from({ length: 3 }).map((_, j) => (
          <mesh key={`${i}-${j}`} position={[-2.5 + i * 0.7, 0.08, -0.8 + j * 0.8]}>
            <cylinderGeometry args={[0.03, 0.03, 0.01, 6]} />
            <meshStandardMaterial color="#d4d4d4" />
          </mesh>
        ))
      ))}
    </group>
  );
}

function CircuitsScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'circuits';
  const p = params[topicId] || {};

  const voltage = p.voltage ?? 12;
  const r1 = p.r1 ?? 10;
  const r2 = p.r2 ?? 20;
  const circuitType = p.circuitType ?? 0;

  const isSeries = circuitType === 0;
  const totalR = isSeries ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const currentTotal = voltage / totalR;
  const currentR1 = isSeries ? currentTotal : voltage / r1;
  const currentR2 = isSeries ? currentTotal : voltage / r2;

  // Define circuit paths as arrays of 3D points
  // Series circuit: rectangular loop
  const seriesPath = useMemo(() => {
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(-2.5, 1.0, 0),   // top-left (battery +)
      new THREE.Vector3(-1.5, 1.0, 0),   // along top wire
      new THREE.Vector3(-1.5, 1.0, 0),   // R1 location
      new THREE.Vector3(-0.5, 1.0, 0),   // past R1
      new THREE.Vector3(1.0, 1.0, 0),    // top-right corner
      new THREE.Vector3(1.0, -1.0, 0),    // right side down
      new THREE.Vector3(-0.5, -1.0, 0),   // R2 location
      new THREE.Vector3(-1.5, -1.0, 0),   // past R2
      new THREE.Vector3(-2.5, -1.0, 0),   // bottom-left corner
      new THREE.Vector3(-2.5, 1.0, 0),   // left side up (back to start)
    ];
    return pts;
  }, []);

  // Parallel circuit: two branches
  const parallelPath1 = useMemo(() => {
    // Top branch through R1
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(-2.5, 1.0, 0.4),   // start (battery +)
      new THREE.Vector3(-1.0, 1.0, 0.4),   // junction
      new THREE.Vector3(0.5, 1.0, 0.4),    // past R1
      new THREE.Vector3(1.5, 1.0, 0.4),    // right junction
      new THREE.Vector3(1.5, -1.0, 0.4),   // down right
      new THREE.Vector3(-2.5, -1.0, 0.4),  // bottom
      new THREE.Vector3(-2.5, 1.0, 0.4),   // back up
    ];
    return pts;
  }, []);

  const parallelPath2 = useMemo(() => {
    // Bottom branch through R2
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(-2.5, 1.0, -0.4),  // start (battery +)
      new THREE.Vector3(-1.0, 1.0, -0.4),   // junction
      new THREE.Vector3(0.5, 1.0, -0.4),    // past R2
      new THREE.Vector3(1.5, 1.0, -0.4),    // right junction
      new THREE.Vector3(1.5, -1.0, -0.4),   // down right
      new THREE.Vector3(-2.5, -1.0, -0.4),  // bottom
      new THREE.Vector3(-2.5, 1.0, -0.4),   // back up
    ];
    return pts;
  }, []);

  const seriesPathRef = useRef<THREE.Vector3[]>(seriesPath);
  const parallelPath1Ref = useRef<THREE.Vector3[]>(parallelPath1);
  const parallelPath2Ref = useRef<THREE.Vector3[]>(parallelPath2);

  // Keep refs updated when paths change
  useEffect(() => {
    seriesPathRef.current = seriesPath;
  }, [seriesPath]);

  useEffect(() => {
    parallelPath1Ref.current = parallelPath1;
  }, [parallelPath1]);

  useEffect(() => {
    parallelPath2Ref.current = parallelPath2;
  }, [parallelPath2]);

  // Generate line points for wire visualization
  const seriesLinePoints: [number, number, number][] = useMemo(() =>
    seriesPath.map(v => [v.x, v.y, v.z] as [number, number, number]),
    [seriesPath]
  );

  const parallelLine1Points: [number, number, number][] = useMemo(() =>
    parallelPath1.map(v => [v.x, v.y, v.z] as [number, number, number]),
    [parallelPath1]
  );

  const parallelLine2Points: [number, number, number][] = useMemo(() =>
    parallelPath2.map(v => [v.x, v.y, v.z] as [number, number, number]),
    [parallelPath2]
  );

  // Electron offsets (evenly distributed along path)
  const electronCount = 6;
  const electronOffsets = useMemo(() =>
    Array.from({ length: electronCount }, (_, i) => i / electronCount),
    []
  );

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0.5, -0.5]}>
        {/* Breadboard base */}
        <Breadboard />

        {/* Battery */}
        <Battery position={[-2.5, 0, 0]} />

        {isSeries ? (
          <>
            {/* Series circuit wires */}
            {/* Top wire: battery+ → R1 → corner */}
            <WireSegment start={[-2.5, 1.0, 0]} end={[-1.8, 1.0, 0]} />
            <WireSegment start={[-1.2, 1.0, 0]} end={[1.0, 1.0, 0]} />
            {/* Right side down */}
            <WireSegment start={[1.0, 1.0, 0]} end={[1.0, -1.0, 0]} />
            {/* Bottom wire: corner → R2 → battery- */}
            <WireSegment start={[1.0, -1.0, 0]} end={[-1.2, -1.0, 0]} />
            <WireSegment start={[-1.8, -1.0, 0]} end={[-2.5, -1.0, 0]} />
            {/* Left side up */}
            <WireSegment start={[-2.5, -1.0, 0]} end={[-2.5, -0.5, 0]} />
            <WireSegment start={[-2.5, 0.5, 0]} end={[-2.5, 1.0, 0]} />

            {/* Corner joints */}
            <WireJoint position={[1.0, 1.0, 0]} />
            <WireJoint position={[1.0, -1.0, 0]} />
            <WireJoint position={[-2.5, 1.0, 0]} />
            <WireJoint position={[-2.5, -1.0, 0]} />

            {/* R1 on top wire */}
            <Resistor position={[-1.5, 1.0, 0]} resistance={r1} label="R1" color="#f97316" />
            {/* R2 on bottom wire */}
            <Resistor position={[-1.5, -1.0, 0]} resistance={r2} label="R2" color="#a855f7" />

            {/* Electrons following series path */}
            {electronOffsets.map((offset, i) => (
              <Electron
                key={`s-${i}`}
                pathRef={seriesPathRef}
                offset={offset}
                color="#fde047"
              />
            ))}

            {/* Current label */}
            <Html position={[1.8, 0, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-yellow-500/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
                I={currentTotal.toFixed(2)}A
              </div>
            </Html>

            {/* Series indicator */}
            <Html position={[0, 1.6, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-800/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
                Series Circuit: R_total={totalR.toFixed(1)}Ω
              </div>
            </Html>
          </>
        ) : (
          <>
            {/* Parallel circuit - Branch 1 (R1, front z=0.4) */}
            <WireSegment start={[-2.5, 1.0, 0.4]} end={[-1.8, 1.0, 0.4]} />
            <WireSegment start={[-1.2, 1.0, 0.4]} end={[1.5, 1.0, 0.4]} />
            <WireSegment start={[1.5, 1.0, 0.4]} end={[1.5, -1.0, 0.4]} />
            <WireSegment start={[1.5, -1.0, 0.4]} end={[-2.5, -1.0, 0.4]} />
            <WireSegment start={[-2.5, -1.0, 0.4]} end={[-2.5, -0.5, 0.4]} />
            <WireSegment start={[-2.5, 0.5, 0.4]} end={[-2.5, 1.0, 0.4]} />

            {/* Parallel circuit - Branch 2 (R2, back z=-0.4) */}
            <WireSegment start={[-2.5, 1.0, -0.4]} end={[-1.8, 1.0, -0.4]} />
            <WireSegment start={[-1.2, 1.0, -0.4]} end={[1.5, 1.0, -0.4]} />
            <WireSegment start={[1.5, 1.0, -0.4]} end={[1.5, -1.0, -0.4]} />
            <WireSegment start={[1.5, -1.0, -0.4]} end={[-2.5, -1.0, -0.4]} />
            <WireSegment start={[-2.5, -1.0, -0.4]} end={[-2.5, -0.5, -0.4]} />
            <WireSegment start={[-2.5, 0.5, -0.4]} end={[-2.5, 1.0, -0.4]} />

            {/* Connecting wires at junctions */}
            <WireSegment start={[-2.5, 1.0, 0.4]} end={[-2.5, 1.0, -0.4]} />
            <WireSegment start={[-2.5, -1.0, 0.4]} end={[-2.5, -1.0, -0.4]} />
            <WireSegment start={[1.5, 1.0, 0.4]} end={[1.5, 1.0, -0.4]} />
            <WireSegment start={[1.5, -1.0, 0.4]} end={[1.5, -1.0, -0.4]} />

            {/* Junction joints */}
            <WireJoint position={[-2.5, 1.0, 0.4]} />
            <WireJoint position={[-2.5, 1.0, -0.4]} />
            <WireJoint position={[-2.5, -1.0, 0.4]} />
            <WireJoint position={[-2.5, -1.0, -0.4]} />
            <WireJoint position={[1.5, 1.0, 0.4]} />
            <WireJoint position={[1.5, 1.0, -0.4]} />

            {/* R1 on front branch */}
            <Resistor position={[-1.5, 1.0, 0.4]} resistance={r1} label="R1" color="#f97316" />
            {/* R2 on back branch */}
            <Resistor position={[-1.5, 1.0, -0.4]} resistance={r2} label="R2" color="#a855f7" />

            {/* Electrons following parallel paths */}
            {electronOffsets.slice(0, 4).map((offset, i) => (
              <Electron
                key={`p1-${i}`}
                pathRef={parallelPath1Ref}
                offset={offset}
                color="#fde047"
              />
            ))}
            {electronOffsets.slice(0, 3).map((offset, i) => (
              <Electron
                key={`p2-${i}`}
                pathRef={parallelPath2Ref}
                offset={offset}
                color="#fbbf24"
              />
            ))}

            {/* Current labels per branch */}
            <Html position={[2.2, 0.4, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-yellow-500/80 px-2 py-1 text-[10px] font-bold text-white shadow">
                I₁={currentR1.toFixed(2)}A
              </div>
            </Html>
            <Html position={[2.2, 0, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-amber-500/80 px-2 py-1 text-[10px] font-bold text-white shadow">
                I₂={currentR2.toFixed(2)}A
              </div>
            </Html>

            {/* Total current label */}
            <Html position={[2.2, -0.4, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-emerald-600/80 px-2 py-1 text-xs font-bold text-white shadow-lg">
                I_total={currentTotal.toFixed(2)}A
              </div>
            </Html>

            {/* Parallel indicator */}
            <Html position={[0, 1.6, 0]} center>
              <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-800/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
                Parallel: R_total={totalR.toFixed(1)}Ω
              </div>
            </Html>
          </>
        )}

        {/* Flow direction arrows */}
        <Html position={[0.5, -1.5, 0]} center>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-gray-700/80 px-2 py-1 text-[10px] text-white shadow">
            Conventional: + → − | Electron flow: − → +
          </div>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0.5, -0.5]} />
    </>
  );
}

export default function CircuitsSimulation() {
  const { params } = useLabStore();
  const topicId = 'circuits';
  const p = params[topicId] || {};

  const voltage = p.voltage ?? 12;
  const r1 = p.r1 ?? 10;
  const r2 = p.r2 ?? 20;
  const circuitType = p.circuitType ?? 0;
  const isSeries = circuitType === 0;
  const totalR = isSeries ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const current = (voltage / totalR).toFixed(3);
  const power = (voltage * parseFloat(current)).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: "Ohm's Law", expression: `V = IR → I = ${current} A` },
        { name: 'Total R', expression: `R = ${totalR.toFixed(1)} Ω (${isSeries ? 'Series' : 'Parallel'})` },
      ]}
      liveValues={[
        { label: 'I', value: current, unit: 'A' },
        { label: 'R_total', value: totalR.toFixed(1), unit: 'Ω' },
        { label: 'P', value: power, unit: 'W' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 2, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <CircuitsScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
