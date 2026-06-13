'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Environment, Sky } from '@react-three/drei';
import * as THREE from 'three';

interface OutdoorEnvironmentProps {
  showTrees?: boolean;
  showGrid?: boolean;
  groundSize?: number;
}

function useTiledTexture(url: string, repeat: [number, number]) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setTexture(tex);
    });
    return () => {
      if (texture) texture.dispose();
    };
  }, [url, repeat[0], repeat[1]]);

  return texture;
}

function GrassGround({ size }: { size: number }) {
  const grassMap = useTiledTexture('/textures/grass.png', [6, 6]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={grassMap} roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

function SimpleTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <coneGeometry args={[0.8, 1.2, 8]} />
        <meshStandardMaterial color="#2d6a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#3a8c3e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.9, 0]} castShadow>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color="#48a44c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function DistancePole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function OutdoorEnvironment({ showTrees = true, showGrid = false, groundSize = 20 }: OutdoorEnvironmentProps) {
  const treePositions: [number, number, number][] = useMemo(() => [
    [-6, 0, -4], [-8, 0, -2], [-7, 0, -6], [7, 0, -5],
    [8, 0, -3], [6, 0, -7], [-5, 0, -8], [5, 0, -8],
    [-9, 0, -6], [9, 0, -7],
  ], []);

  return (
    <group>
      <ambientLight intensity={0.4} color="#ffe8c0" />
      <directionalLight position={[10, 15, 5]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} color="#fff8f0" />
      <directionalLight position={[-5, 8, -3]} intensity={0.3} color="#a0c0ff" />

      <Sky sunPosition={[10, 15, 5]} turbidity={3} rayleigh={0.5} />
      <GrassGround size={groundSize} />

      {showTrees && treePositions.map((pos, i) => (
        <SimpleTree key={i} position={pos} />
      ))}

      <DistancePole position={[2, 0, 0.5]} />
      <DistancePole position={[4, 0, 0.5]} />
      <DistancePole position={[6, 0, 0.5]} />
      <DistancePole position={[8, 0, 0.5]} />

      {showGrid && (
        <gridHelper args={[groundSize, 20, '#4ade8055', '#4ade8033']} position={[0, 0.01, 0]} />
      )}

      <Environment preset="sunset" background={false} />
      <fog attach="fog" args={['#c8e6c8', 12, 35]} />
    </group>
  );
}
