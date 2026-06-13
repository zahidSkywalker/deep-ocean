'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

interface LabEnvironmentProps {
  variant?: 'full' | 'table' | 'floor-only';
  floorSize?: number;
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

function TexturedFloor({ size }: { size: number }) {
  const tilesMap = useTiledTexture('/textures/tiles.png', [4, 4]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size * 0.6]} />
      <meshStandardMaterial map={tilesMap} roughness={0.6} metalness={0.1} />
    </mesh>
  );
}

function TexturedBackWall() {
  const concreteMap = useTiledTexture('/textures/concrete.png', [3, 2]);

  return (
    <mesh position={[0, 2, -2.5]}>
      <planeGeometry args={[8, 4]} />
      <meshStandardMaterial map={concreteMap} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function TexturedCeiling() {
  return (
    <mesh position={[0, 4, -1]}>
      <planeGeometry args={[8, 5]} rotation={[Math.PI / 2, 0, 0]} />
      <meshStandardMaterial color="#e8e8e0" roughness={0.9} metalness={0.0} />
    </mesh>
  );
}

function LabBench({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const woodMap = useTiledTexture('/textures/wood.png', [3, 1]);
  const metalMap = useTiledTexture('/textures/metal.png', [1, 1]);

  const legPositions: [number, number, number][] = [
    [-0.9, -0.4, -0.3],
    [-0.9, -0.4, 0.3],
    [0.9, -0.4, -0.3],
    [0.9, -0.4, 0.3],
  ];

  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.08, 0.7]} />
        <meshStandardMaterial map={woodMap} roughness={0.7} metalness={0.1} />
      </mesh>
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial map={metalMap} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[1.8, 0.04, 0.04]} />
        <meshStandardMaterial map={metalMap} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

function CeilingLights() {
  return (
    <group>
      <mesh position={[-2, 3.9, -1]}>
        <boxGeometry args={[2.5, 0.04, 0.15]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[-2, 3.8, -1]} intensity={1.5} distance={8} color="#fff8e7" castShadow />
      <mesh position={[2, 3.9, -1]}>
        <boxGeometry args={[2.5, 0.04, 0.15]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[2, 3.8, -1]} intensity={1.5} distance={8} color="#fff8e7" castShadow />
    </group>
  );
}

export function LabEnvironment({ variant = 'full', floorSize = 10 }: LabEnvironmentProps) {
  return (
    <group>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 3]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 5, -2]} intensity={0.2} />

      {variant !== 'floor-only' && <CeilingLights />}
      {variant === 'full' && (
        <>
          <TexturedBackWall />
          <TexturedCeiling />
        </>
      )}

      <TexturedFloor size={floorSize} />
      {(variant === 'full' || variant === 'table') && <LabBench position={[0, -0.4, -0.5]} />}

      <Environment preset="city" background={false} />
      <fog attach="fog" args={['#1a1a2e', 8, 20]} />
    </group>
  );
}
