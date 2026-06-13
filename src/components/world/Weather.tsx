'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── Rain Particles ─── */
function Rain({ count = 8000 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;
  const positionsRef = useRef<Float32Array>(null);
  const velocitiesRef = useRef<Float32Array>(null);

  // Initialize arrays on first render
  if (!positionsRef.current) {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      vel[i] = 15 + Math.random() * 25;
    }
    positionsRef.current = pos;
    velocitiesRef.current = vel;
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const posArray = positionsRef.current!;
    const velArray = velocitiesRef.current!;
    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] -= velArray[i] * delta;

      // Reset when below ground
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = 50 + Math.random() * 10;
        posArray[i * 3] = (Math.random() - 0.5) * 200;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }

      dummy.position.set(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
      dummy.scale.set(0.02, 0.4, 0.02);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshStandardMaterial
        color="#aabbdd"
        transparent
        opacity={0.4}
        emissive="#6688aa"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
}

/* ─── Lightning Flash ─── */
function Lightning() {
  const lightRef = useRef<THREE.PointLight>(null);
  const nextFlash = useRef(Math.random() * 5 + 2);

  useFrame((state) => {
    if (!lightRef.current) return;
    nextFlash.current -= state.clock.getDelta();

    if (nextFlash.current <= 0) {
      // Flash!
      lightRef.current.intensity = 10 + Math.random() * 15;
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 0;
      }, 50);
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 5 + Math.random() * 10;
      }, 120);
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 0;
      }, 170);

      nextFlash.current = Math.random() * 8 + 3;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 50, 0]}
      intensity={0}
      color="#ccddff"
      distance={300}
    />
  );
}

/* ─── Weather System ─── */
export default function Weather() {
  const weather = useWorldStore((s) => s.weather);

  const fogDensity = weather === 'fog' ? 0.025 : weather === 'storm' ? 0.015 : 0;
  const fogColor = weather === 'storm' ? '#1a1a2e' : '#999999';

  const rainVisible = weather === 'rain' || weather === 'storm';
  const showLightning = weather === 'storm';

  return (
    <>
      {/* Scene fog */}
      {weather !== 'clear' && (
        <fog attach="fog" args={[fogColor, 20, 200 - fogDensity * 4000]} />
      )}

      {/* Rain */}
      {rainVisible && <Rain count={weather === 'storm' ? 15000 : 8000} />}

      {/* Lightning (storm only) */}
      {showLightning && <Lightning />}

      {/* Darken sky for overcast */}
      {(weather === 'rain' || weather === 'fog' || weather === 'storm') && (
        <ambientLight intensity={-0.15} color="#667788" />
      )}
    </>
  );
}
