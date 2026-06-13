'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Arrow3DProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  shaftRadius?: number;
  headRadius?: number;
  headLength?: number;
}

export function Arrow3D({
  start,
  end,
  color = '#4ade80',
  shaftRadius = 0.04,
  headRadius = 0.12,
  headLength = 0.3,
}: Arrow3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { direction, length, midpoint } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = dir.length();
    dir.normalize();
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    return { direction: dir, length: len, midpoint: mid };
  }, [start, end]);

  const shaftLength = Math.max(0, length - headLength);

  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, direction);
    return q;
  }, [direction]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(midpoint);
      groupRef.current.quaternion.copy(quaternion);
    }
  });

  return (
    <group ref={groupRef} position={[midpoint.x, midpoint.y, midpoint.z]}>
      {/* Shaft */}
      <mesh
        position={[0, shaftLength / 2, 0]}
        castShadow
      >
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Arrow head */}
      <mesh
        position={[0, shaftLength + headLength / 2, 0]}
        castShadow
      >
        <coneGeometry args={[headRadius, headLength, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}
