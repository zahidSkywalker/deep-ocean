'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { SpaceEnvironment } from '@/components/simulation/SpaceEnvironment';

const MAX_TRAIL = 400;

function GravityScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'gravity';
  const p = params[topicId] || {};

  const mass1 = p.mass1 ?? 5e12;
  const mass2 = p.mass2 ?? 10;
  const orbitalRadius = p.orbitalRadius ?? 8;

  const G = 6.674e-11;
  const orbitalSpeed = Math.sqrt((G * mass1) / (orbitalRadius * 10));
  const scaledSpeed = orbitalSpeed * 1e5;

  const gravForce = (G * mass1 * mass2) / (orbitalRadius * orbitalRadius * 100);
  const orbitalVelocity = orbitalSpeed * 1e3;

  const angleRef = useRef(0);
  const trailIndexRef = useRef(0);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Points>(null);
  const forceLineRef = useRef<THREE.Line>(null);

  // Geometry refs — created in useEffect, mutated in useFrame
  const trailGeoRef = useRef<THREE.BufferGeometry>(null);
  const forceGeoRef = useRef<THREE.BufferGeometry>(null);

  // Eccentricity for elliptical orbit
  const eccentricity = 0.15;

  const orbitPathPoints = useMemo((): [number, number, number][] => {
    const pts: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = orbitalRadius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(theta));
      pts.push([Math.cos(theta) * r, 0, Math.sin(theta) * r]);
    }
    return pts;
  }, [orbitalRadius, eccentricity]);

  // Create geometries in useEffect (avoids ref access + immutability issues)
  useEffect(() => {
    // Trail geometry
    const trailPos = new Float32Array(MAX_TRAIL * 3);
    const trailCol = new Float32Array(MAX_TRAIL * 4);
    for (let i = 0; i < MAX_TRAIL; i++) {
      const fade = 1 - i / MAX_TRAIL;
      trailCol[i * 4] = 0.65;
      trailCol[i * 4 + 1] = 0.55;
      trailCol[i * 4 + 2] = 0.98;
      trailCol[i * 4 + 3] = fade * 0.6;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 4));
    trailGeo.setDrawRange(0, 0);
    trailGeoRef.current = trailGeo;

    if (trailRef.current) {
      const old = trailRef.current.geometry;
      trailRef.current.geometry = trailGeo;
      old.dispose();
    }

    // Force line geometry
    const forceGeo = new THREE.BufferGeometry();
    forceGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    forceGeoRef.current = forceGeo;

    if (forceLineRef.current) {
      const old = forceLineRef.current.geometry;
      forceLineRef.current.geometry = forceGeo;
      old.dispose();
    }

    return () => {
      trailGeo.dispose();
      forceGeo.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!isPlaying) return;

    angleRef.current += delta * scaledSpeed;
    const angle = angleRef.current;
    const r = orbitalRadius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(angle));
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    if (orbitGroupRef.current) {
      orbitGroupRef.current.position.set(x, 0, z);
    }

    // Update trail
    if (trailGeoRef.current) {
      const attr = trailGeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const idx = trailIndexRef.current % MAX_TRAIL;
      arr[idx * 3] = x;
      arr[idx * 3 + 1] = 0;
      arr[idx * 3 + 2] = z;
      trailIndexRef.current++;
      trailGeoRef.current.setDrawRange(0, Math.min(trailIndexRef.current, MAX_TRAIL));
      attr.needsUpdate = true;
    }

    // Update force line
    if (forceGeoRef.current) {
      const attr = forceGeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      arr[0] = 0; arr[1] = 0; arr[2] = 0;
      arr[3] = x; arr[4] = 0; arr[5] = z;
      attr.needsUpdate = true;
    }
  });

  return (
    <>
      <SpaceEnvironment showStars={true} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#fde047" distance={20} />

      {/* Central body */}
      <group>
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshStandardMaterial color="#fde047" emissive="#f97316" emissiveIntensity={0.8} roughness={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.7, 32, 32]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.08} side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Orbit path ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitalRadius * 0.97, orbitalRadius * 1.03, 128]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <Line points={orbitPathPoints} color="#64748b" lineWidth={1} transparent opacity={0.25} />

      {/* Trail */}
      <points ref={trailRef}>
        <bufferGeometry />
        <pointsMaterial color="#a78bfa" size={0.06} sizeAttenuation transparent opacity={0.6} vertexColors depthWrite={false} />
      </points>

      {/* Orbiting body group — planet + glow as children */}
      <group ref={orbitGroupRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.1} side={THREE.BackSide} />
        </mesh>
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, 0.8, 0]}>
          <span style={{ color: '#a78bfa', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
            M₂={mass2} kg
          </span>
        </Html>
      </group>

      {/* Force line */}
      <line ref={forceLineRef as React.RefObject<THREE.Line>}>
        <bufferGeometry />
        <lineDashedMaterial color="#ef4444" transparent opacity={0.5} dashSize={0.3} gapSize={0.2} />
      </line>

      <Html position={[0, 2.2, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#fde047', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
          M₁={mass1.toExponential(1)} kg
        </span>
      </Html>
      <Html position={[0, -2.5, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
          F={gravForce.toExponential(2)} N
        </span>
      </Html>
      <Html position={[0, -3, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
          v={orbitalVelocity.toFixed(1)} m/s · r={orbitalRadius}
        </span>
      </Html>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault />
    </>
  );
}

export default function GravitySimulation() {
  const { params } = useLabStore();
  const topicId = 'gravity';
  const p = params[topicId] || {};
  const mass1 = p.mass1 ?? 5e12;
  const mass2 = p.mass2 ?? 10;
  const orbitalRadius = p.orbitalRadius ?? 8;
  const G = 6.674e-11;
  const gravForce = ((G * mass1 * mass2) / (orbitalRadius * orbitalRadius * 100)).toExponential(2);
  const orbitalVelocity = (Math.sqrt((G * mass1) / (orbitalRadius * 10)) * 1e3).toFixed(1);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Gravitational Force', expression: `F = GMm/r²` },
        { name: 'Orbital Velocity', expression: `v = √(GM/r)` },
      ]}
      liveValues={[
        { label: 'F', value: gravForce, unit: 'N' },
        { label: 'v', value: orbitalVelocity, unit: 'm/s' },
        { label: 'r', value: String(orbitalRadius), unit: '' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [10, 8, 12], fov: 50 }}>
        <Suspense fallback={null}><GravityScene /></Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
