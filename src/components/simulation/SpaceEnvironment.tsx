'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

interface SpaceEnvironmentProps {
  showStars?: boolean;
}

function SpaceSkybox() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/skybox/space.png', (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setTexture(tex);
    });
  }, []);

  if (!texture) return null;

  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function StarField({ count = 500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.06} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function NebulaGlow() {
  return (
    <group>
      <mesh position={[15, 8, -20]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-12, -5, -25]}>
        <sphereGeometry args={[7, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[5, -10, -18]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function PlanetTexture({ color, emissiveColor, emissiveIntensity, position, radius }: {
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  position: [number, number, number];
  radius: number;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

export function SpaceEnvironment({ showStars = true }: SpaceEnvironmentProps) {
  return (
    <group>
      <ambientLight intensity={0.1} />
      <SpaceSkybox />
      {showStars && <StarField count={400} />}
      <NebulaGlow />
      <PlanetTexture color="#f97316" emissiveColor="#f97316" emissiveIntensity={0.3} position={[25, 10, -30]} radius={2} />
      <PlanetTexture color="#64748b" emissiveColor="#94a3b8" emissiveIntensity={0.15} position={[-20, -8, -25]} radius={3} />
      <fog attach="fog" args={['#020210', 15, 45]} />
    </group>
  );
}
