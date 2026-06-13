'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

function DynamicSpring({
  wallXRef,
  blockXRef,
  y,
  numCoils = 20,
  coilRadius = 0.12,
}: {
  wallXRef: React.RefObject<number | null>;
  blockXRef: React.RefObject<number | null>;
  y: number;
  numCoils?: number;
  coilRadius?: number;
}) {
  const springRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!springRef.current) return;
    const wallX = wallXRef.current ?? -3;
    const blockX = blockXRef.current ?? 0;
    const springLength = blockX - wallX;
    const coilCount = springRef.current.children.length;

    for (let i = 0; i < coilCount; i++) {
      const t = i / (coilCount - 1);
      const cx = wallX + springLength * t;
      const cy = Math.sin(t * numCoils * Math.PI) * coilRadius + y;
      const cz = Math.cos(t * numCoils * Math.PI) * coilRadius;
      if (springRef.current.children[i]) {
        springRef.current.children[i].position.set(cx, cy, cz);
      }
    }
  });

  return (
    <group ref={springRef}>
      {Array.from({ length: numCoils }).map((_, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function SineGraph({
  amplitude,
  omega,
  timeRef,
  y,
  z,
  width = 4,
  color = '#22d3ee',
}: {
  amplitude: number;
  omega: number;
  timeRef: React.RefObject<number | null>;
  y: number;
  z: number;
  width?: number;
  color?: string;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const numPoints = 100;

  // Create geometry in useEffect, attach to line
  useEffect(() => {
    const positions = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      positions[i * 3] = -width / 2 + width * (i / (numPoints - 1));
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geoRef.current = g;

    if (lineRef.current) {
      const old = lineRef.current.geometry;
      lineRef.current.geometry = g;
      old.dispose();
    }

    return () => g.dispose();
  }, [numPoints, width, y, z]);

  useFrame(() => {
    if (!geoRef.current) return;
    const t = timeRef.current ?? 0;
    const attr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < numPoints; i++) {
      const frac = i / (numPoints - 1);
      arr[i * 3] = -width / 2 + width * frac;
      arr[i * 3 + 1] = amplitude * Math.cos(omega * t - frac * Math.PI * 2) + y;
      arr[i * 3 + 2] = z;
    }
    attr.needsUpdate = true;
  });

  return (
    <line ref={lineRef as React.RefObject<THREE.Line>}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={0.6} />
    </line>
  );
}

function SHMScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'shm';
  const p = params[topicId] || {};

  const mass = p.mass ?? 1;
  const springConstant = p.springConstant ?? 20;
  const amplitude = p.amplitude ?? 1;
  const damping = p.damping ?? 0.1;

  const omega = Math.sqrt(springConstant / mass);
  const period = (2 * Math.PI) / omega;

  const timeRef = useRef(0);
  const displacementRef = useRef(0);
  const massRef = useRef<THREE.Mesh>(null);
  const dispArrowGroupRef = useRef<THREE.Group>(null);
  const dispLabelRef = useRef<HTMLSpanElement>(null);

  const wallX = -3;
  const equilibriumX = 0;
  const blockXRef = useRef(equilibriumX);
  const wallXRef = useRef(wallX);

  useFrame((_, delta) => {
    if (!isPlaying) return;

    timeRef.current += delta;
    const t = timeRef.current;

    displacementRef.current = amplitude * Math.exp(-damping * t) * Math.cos(omega * t);
    const blockX = equilibriumX + displacementRef.current;
    blockXRef.current = blockX;

    if (massRef.current) {
      massRef.current.position.x = blockX;
    }

    if (dispArrowGroupRef.current) {
      const absDisp = Math.abs(displacementRef.current);
      dispArrowGroupRef.current.visible = absDisp > 0.03;
      if (absDisp > 0.03) {
        dispArrowGroupRef.current.position.x = displacementRef.current / 2;
        dispArrowGroupRef.current.scale.x = displacementRef.current;
      }
    }

    if (dispLabelRef.current) {
      dispLabelRef.current.textContent = `x=${displacementRef.current.toFixed(2)} m`;
    }
  });

  return (
    <>
      <LabEnvironment variant="table" />
      <group position={[0, -0.35, -0.5]}>
        <mesh position={[wallX, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.6, 1.5]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
        </mesh>

        <DynamicSpring wallXRef={wallXRef} blockXRef={blockXRef} y={0.5} numCoils={24} coilRadius={0.12} />

        <mesh ref={massRef} position={[equilibriumX, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.3} roughness={0.3} metalness={0.5} />
        </mesh>

        <Html position={[equilibriumX, 1.2, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>
            m={mass} kg, k={springConstant} N/m
          </span>
        </Html>

        <mesh position={[equilibriumX, 0.15, 0]}>
          <boxGeometry args={[0.02, 0.02, 1.5]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} />
        </mesh>
        <Html position={[equilibriumX, -0.1, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#f97316', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>x=0</span>
        </Html>

        <group ref={dispArrowGroupRef} position={[0, -0.3, 0]} visible={false}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
          </mesh>
        </group>

        <Html position={[equilibriumX, -0.6, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <span ref={dispLabelRef} style={{ color: '#ef4444', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>x=0.00 m</span>
        </Html>

        <Html position={[2, 0.5, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>T={period.toFixed(2)} s</span>
        </Html>

        <SineGraph amplitude={amplitude} omega={omega} timeRef={timeRef} y={-0.8} z={0} width={5} color="#22d3ee" />

        <mesh position={[0, -0.8, 0.05]}>
          <boxGeometry args={[5, 0.01, 0.01]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.4} />
        </mesh>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0, -0.5]} />
    </>
  );
}

export default function SHMSimulation() {
  const { params } = useLabStore();
  const topicId = 'shm';
  const p = params[topicId] || {};
  const mass = p.mass ?? 1;
  const springConstant = p.springConstant ?? 20;
  const amplitude = p.amplitude ?? 1;
  const damping = p.damping ?? 0.1;
  const omega = Math.sqrt(springConstant / mass);
  const period = ((2 * Math.PI) / omega).toFixed(3);
  const frequency = (1 / parseFloat(period)).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Period', expression: `T = 2π√(m/k) = ${period}s` },
        { name: 'Frequency', expression: `f = ${frequency} Hz` },
      ]}
      liveValues={[
        { label: 'T', value: period, unit: 's' },
        { label: 'f', value: frequency, unit: 'Hz' },
        { label: 'ω', value: omega.toFixed(2), unit: 'rad/s' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [3, 2, 5], fov: 50 }}>
        <Suspense fallback={null}><SHMScene /></Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
