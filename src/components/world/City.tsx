'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── Building Window Texture Generator ─── */
function createBuildingTexture(width: number, height: number, floorCount: number, isNight: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base wall color - concrete/glass tones
  const wallColors = ['#8899aa', '#7a8a9a', '#99aabb', '#667788', '#aabbcc', '#bbc8d4', '#6b7b8b'];
  const wallColor = wallColors[Math.floor(Math.random() * wallColors.length)];
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, width, height);

  // Add subtle variation/noise to wall
  for (let i = 0; i < width * height * 0.02; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Windows
  const windowW = Math.floor(width / 8);
  const windowH = Math.floor(height / (floorCount * 3));
  const gapX = Math.floor((width - windowW * 4) / 5);
  const gapY = Math.floor((height / floorCount - windowH) / 2);

  for (let floor = 0; floor < floorCount; floor++) {
    for (let col = 0; col < 4; col++) {
      const x = gapX + col * (windowW + gapX);
      const y = floor * Math.floor(height / floorCount) + gapY;

      if (isNight) {
        // Some windows lit, some dark
        const isLit = Math.random() > 0.3;
        if (isLit) {
          const warmth = Math.random();
          ctx.fillStyle = warmth > 0.5
            ? `rgba(255, 220, 120, ${0.7 + Math.random() * 0.3})`
            : `rgba(200, 220, 255, ${0.5 + Math.random() * 0.3})`;
        } else {
          ctx.fillStyle = `rgba(30, 40, 60, 0.9)`;
        }
      } else {
        // Daytime - reflective glass
        const reflect = Math.random();
        ctx.fillStyle = `rgba(${140 + reflect * 60}, ${170 + reflect * 50}, ${200 + reflect * 55}, 0.8)`;
      }
      ctx.fillRect(x, y, windowW, windowH);

      // Window frame
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, windowW, windowH);
    }
  }

  // Horizontal floor lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let floor = 1; floor < floorCount; floor++) {
    const y = floor * Math.floor(height / floorCount);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/* ─── Single Building ─── */
interface BuildingProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  seed: number;
  isNight: boolean;
}

function Building({ position, width, depth, height, seed, isNight }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create textures
  const textures = useMemo(() => {
    // Use seed for consistent randomness
    const rng = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const floorCount = Math.max(3, Math.floor(height / 3));
    const texFront = createBuildingTexture(256, 256, floorCount, isNight);
    const texSide = createBuildingTexture(256, 256, floorCount, isNight);
    const texTop = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#556677';
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    return [texFront, texSide, texSide, texTop, texSide, texFront];
  }, [seed, height, isNight]);

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        map={textures[0]}
        roughness={0.7}
        metalness={0.1}
        envMapIntensity={0.5}
      />
      {/* Side material */}
      <meshStandardMaterial
        map={textures[2]}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

/* ─── City Grid Generator ─── */
export default function City() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;

  const buildings = useMemo(() => {
    const bldgs: { pos: [number, number, number]; w: number; d: number; h: number; seed: number }[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    // Create a city block layout
    const blockSize = 40;
    const streetWidth = 16;
    const gridRange = 4; // -4 to 4 blocks

    for (let gx = -gridRange; gx <= gridRange; gx++) {
      for (let gz = -gridRange; gz <= gridRange; gz++) {
        const blockX = gx * (blockSize + streetWidth);
        const blockZ = gz * (blockSize + streetWidth);

        // Determine block type based on distance from center
        const distFromCenter = Math.sqrt(gx * gx + gz * gz);
        const maxH = distFromCenter < 1.5 ? 60 : distFromCenter < 3 ? 35 : 18;

        // Create 1-4 buildings per block
        const buildingCount = 1 + Math.floor(rng(gx * 100 + gz) * 3);

        for (let i = 0; i < buildingCount; i++) {
          const bSeed = gx * 1000 + gz * 100 + i * 10;
          const h = 8 + rng(bSeed) * maxH;
          const w = 8 + rng(bSeed + 1) * (blockSize / buildingCount - 4);
          const d = 8 + rng(bSeed + 2) * (blockSize - 8);

          const offsetX = buildingCount > 1
            ? (i - (buildingCount - 1) / 2) * (blockSize / buildingCount)
            : 0;
          const offsetZ = rng(bSeed + 3) * (blockSize - d - 4) - (blockSize - d - 4) / 2;

          bldgs.push({
            pos: [blockX + offsetX + w / 2 - blockSize / 2, h / 2, blockZ + offsetZ + d / 2 - blockSize / 2],
            w, d, h,
            seed: bSeed,
          });
        }
      }
    }
    return bldgs;
  }, []);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <Building
          key={`b-${i}`}
          position={b.pos}
          width={b.w}
          depth={b.d}
          height={b.h}
          seed={b.seed}
          isNight={isNight}
        />
      ))}

      {/* City sub-components */}
      <Roads />
      <StreetLights />
      <Trees />
    </group>
  );
}

/* ─── Roads ─── */
function Roads() {
  const roads = useMemo(() => {
    const r: { pos: [number, number, number]; rot: [number, number, number]; size: [number, number, number] }[] = [];
    const blockSize = 40;
    const streetWidth = 16;
    const gridRange = 4;
    const totalSpan = (gridRange * 2 + 1) * (blockSize + streetWidth);

    // Horizontal roads
    for (let gz = -gridRange; gz <= gridRange + 1; gz++) {
      const z = gz * (blockSize + streetWidth) - streetWidth / 2;
      r.push({
        pos: [0, 0.01, z],
        rot: [0, 0, 0],
        size: [totalSpan + 40, 0.02, streetWidth],
      });
    }

    // Vertical roads
    for (let gx = -gridRange; gx <= gridRange + 1; gx++) {
      const x = gx * (blockSize + streetWidth) - streetWidth / 2;
      r.push({
        pos: [x, 0.01, 0],
        rot: [0, 0, 0],
        size: [streetWidth, 0.02, totalSpan + 40],
      });
    }

    return r;
  }, []);

  return (
    <group>
      {roads.map((r, i) => (
        <mesh key={`road-${i}`} position={r.pos} rotation={r.rot} receiveShadow>
          <boxGeometry args={r.size} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.85} />
        </mesh>
      ))}
      {/* Road markings - center lines */}
      {roads.map((r, i) => {
        if (r.size[0] > r.size[2]) {
          // Horizontal road - dashed center line
          return Array.from({ length: 30 }).map((_, j) => (
            <mesh key={`mark-${i}-${j}`} position={[r.pos[0] - 140 + j * 10, 0.02, r.pos[2]]} receiveShadow>
              <boxGeometry args={[5, 0.01, 0.3]} />
              <meshStandardMaterial color="#cccc44" roughness={0.5} />
            </mesh>
          ));
        } else {
          return Array.from({ length: 30 }).map((_, j) => (
            <mesh key={`mark-${i}-${j}`} position={[r.pos[0], 0.02, r.pos[2] - 140 + j * 10]} receiveShadow>
              <boxGeometry args={[0.3, 0.01, 5]} />
              <meshStandardMaterial color="#cccc44" roughness={0.5} />
            </mesh>
          ));
        }
      })}
      {/* Sidewalks along roads */}
      <Sidewalks />
    </group>
  );
}

/* ─── Sidewalks ─── */
function Sidewalks() {
  const blockSize = 40;
  const streetWidth = 16;
  const gridRange = 4;
  const totalSpan = (gridRange * 2 + 1) * (blockSize + streetWidth);
  const walkWidth = 3;

  const sidewalks = useMemo(() => {
    const sw: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let i = -gridRange; i <= gridRange + 1; i++) {
      const coord = i * (blockSize + streetWidth) - streetWidth / 2;
      // Along each road edge
      sw.push({ pos: [0, 0.15, coord - streetWidth / 2 - walkWidth / 2], size: [totalSpan + 40, 0.3, walkWidth] });
      sw.push({ pos: [0, 0.15, coord + streetWidth / 2 + walkWidth / 2], size: [totalSpan + 40, 0.3, walkWidth] });
      sw.push({ pos: [coord - streetWidth / 2 - walkWidth / 2, 0.15, 0], size: [walkWidth, 0.3, totalSpan + 40] });
      sw.push({ pos: [coord + streetWidth / 2 + walkWidth / 2, 0.15, 0], size: [walkWidth, 0.3, totalSpan + 40] });
    }
    return sw;
  }, []);

  return (
    <>
      {sidewalks.map((s, i) => (
        <mesh key={`sw-${i}`} position={s.pos} receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color="#666666" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

/* ─── Street Lights ─── */
function StreetLights() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
  const lightIntensity = isNight ? 2.5 : 0;
  const blockSize = 40;
  const streetWidth = 16;
  const gridRange = 4;

  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = -gridRange; i <= gridRange + 1; i++) {
      for (let j = -gridRange; j <= gridRange + 1; j++) {
        const x = i * (blockSize + streetWidth) - streetWidth / 2 + streetWidth / 3;
        const z = j * (blockSize + streetWidth) - streetWidth / 2 + streetWidth / 3;
        pos.push([x, 0, z]);
      }
    }
    return pos;
  }, []);

  return (
    <>
      {positions.map((pos, i) => (
        <group key={`light-${i}`} position={pos}>
          {/* Pole */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 7, 8]} />
            <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Arm */}
          <mesh position={[0.8, 6.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
            <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Lamp */}
          <mesh position={[1.6, 6.8, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.3]} />
            <meshStandardMaterial
              color={isNight ? "#ffeeaa" : "#aaaaaa"}
              emissive={isNight ? "#ffdd88" : "#000000"}
              emissiveIntensity={isNight ? 2 : 0}
            />
          </mesh>
          {/* Light source */}
          {isNight && (
            <pointLight
              position={[1.6, 6.5, 0]}
              intensity={lightIntensity}
              distance={20}
              decay={2}
              color="#ffddaa"
              castShadow
              shadow-mapSize-width={512}
              shadow-mapSize-height={512}
            />
          )}
        </group>
      ))}
    </>
  );
}

/* ─── Trees ─── */
function Trees() {
  const blockSize = 40;
  const streetWidth = 16;
  const gridRange = 3;

  const trees = useMemo(() => {
    const t: { pos: [number, number, number]; scale: number }[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s * 43758.5453) * 12345.6789;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 120; i++) {
      const x = (rng(i * 1.1) - 0.5) * gridRange * 2 * (blockSize + streetWidth);
      const z = (rng(i * 2.3) - 0.5) * gridRange * 2 * (blockSize + streetWidth);
      // Don't place in road areas
      const modX = ((x % (blockSize + streetWidth)) + (blockSize + streetWidth)) % (blockSize + streetWidth);
      const modZ = ((z % (blockSize + streetWidth)) + (blockSize + streetWidth)) % (blockSize + streetWidth);
      const inRoad = modX < streetWidth || modZ < streetWidth;
      const inBlock = modX > streetWidth && modZ > streetWidth;

      if (inRoad && !inBlock) {
        const scale = 0.6 + rng(i * 3.7) * 0.8;
        t.push({ pos: [x, 0, z], scale });
      }
    }
    return t;
  }, []);

  return (
    <>
      {trees.map((t, i) => (
        <group key={`tree-${i}`} position={t.pos}>
          {/* Trunk */}
          <mesh position={[0, 1.5 * t.scale, 0]} castShadow>
            <cylinderGeometry args={[0.15 * t.scale, 0.2 * t.scale, 3 * t.scale, 8]} />
            <meshStandardMaterial color="#5a3a20" roughness={0.9} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 3.5 * t.scale, 0]} castShadow>
            <sphereGeometry args={[1.5 * t.scale, 8, 6]} />
            <meshStandardMaterial color="#1a5a1a" roughness={0.8} />
          </mesh>
          <mesh position={[0.5 * t.scale, 3 * t.scale, 0.3 * t.scale]} castShadow>
            <sphereGeometry args={[1.2 * t.scale, 8, 6]} />
            <meshStandardMaterial color="#2a6a2a" roughness={0.8} />
          </mesh>
          <mesh position={[-0.4 * t.scale, 3.8 * t.scale, -0.3 * t.scale]} castShadow>
            <sphereGeometry args={[1 * t.scale, 8, 6]} />
            <meshStandardMaterial color="#1e5e1e" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}
