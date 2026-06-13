'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── Cars driving on roads ─── */
const CAR_COUNT = 24;
const BLOCK_SIZE = 40;
const STREET_WIDTH = 16;
const GRID_RANGE = 4;
const TOTAL_SPAN = (GRID_RANGE * 2 + 1) * (BLOCK_SIZE + STREET_WIDTH);

const CAR_COLORS = [
  '#cc2222', '#2255cc', '#222222', '#eeeeee', '#888888',
  '#339933', '#cc8800', '#6633cc', '#cc3366', '#225555',
  '#ff4444', '#4488ff', '#333333', '#f0f0f0', '#999999',
  '#44aa44', '#dd9900', '#7755dd', '#ee5588', '#338888',
];

const CAR_TYPES = [
  { bodyW: 4.2, bodyH: 1.3, bodyD: 1.8, roofW: 2.4, roofH: 1.0, roofD: 1.6, roofOffset: 0.3, wheelR: 0.35, speed: 8 },
  { bodyW: 5.0, bodyH: 1.6, bodyD: 2.0, roofW: 3.2, roofH: 1.2, roofD: 1.8, roofOffset: 0.2, wheelR: 0.4, speed: 6 },
  { bodyW: 3.8, bodyH: 1.2, bodyD: 1.7, roofW: 2.0, roofH: 0.9, roofD: 1.5, roofOffset: 0.35, wheelR: 0.32, speed: 10 },
  { bodyW: 6.0, bodyH: 1.8, bodyD: 2.2, roofW: 4.0, roofH: 1.3, roofD: 2.0, roofOffset: 0.0, wheelR: 0.45, speed: 7 },
  { bodyW: 3.5, bodyH: 1.1, bodyD: 1.6, roofW: 1.8, roofH: 0.85, roofD: 1.4, roofOffset: 0.4, wheelR: 0.3, speed: 12 },
];

interface CarData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  color: THREE.Color;
  type: typeof CAR_TYPES[0];
  lane: number;
  roadAxis: 'x' | 'z';
  roadIndex: number;
  side: -1 | 1;
}

function generateCars(): CarData[] {
  const cars: CarData[] = [];
  const rng = (s: number) => {
    const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < CAR_COUNT; i++) {
    const seed = i * 23 + 7;
    const roadAxis = rng(seed) > 0.5 ? 'x' : 'z';
    const roadIdx = Math.floor(rng(seed + 1) * (GRID_RANGE * 2 + 2)) - GRID_RANGE;
    const side: -1 | 1 = rng(seed + 2) > 0.5 ? 1 : -1;
    const basePos = roadIdx * (BLOCK_SIZE + STREET_WIDTH) - STREET_WIDTH / 2;

    // Position along the road
    const along = (rng(seed + 3) - 0.5) * TOTAL_SPAN;
    // Lane offset (drive on right side)
    const laneOffset = side * (STREET_WIDTH * 0.2);

    const carType = CAR_TYPES[Math.floor(rng(seed + 4) * CAR_TYPES.length)];
    const speed = carType.speed * (0.8 + rng(seed + 5) * 0.4);

    let pos: THREE.Vector3;
    let dir: THREE.Vector3;

    if (roadAxis === 'x') {
      pos = new THREE.Vector3(along, 0.35, basePos + laneOffset);
      dir = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
    } else {
      pos = new THREE.Vector3(basePos + laneOffset, 0.35, along);
      dir = new THREE.Vector3(0, 0, side > 0 ? 1 : -1);
    }

    cars.push({
      position: pos,
      direction: dir,
      speed,
      color: new THREE.Color(CAR_COLORS[Math.floor(rng(seed + 6) * CAR_COLORS.length)]),
      type: carType,
      lane: 0,
      roadAxis,
      roadIndex: roadIdx,
      side,
    });
  }

  return cars;
}

/* ─── Single Car Component ─── */
function Car({ data, isNight }: { data: CarData; isNight: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const headlightLeftRef = useRef<THREE.SpotLight>(null);
  const headlightRightRef = useRef<THREE.SpotLight>(null);
  const tailLeftRef = useRef<THREE.PointLight>(null);
  const tailRightRef = useRef<THREE.PointLight>(null);

  const t = data.type;
  const halfSpan = TOTAL_SPAN / 2 + 30;

  useFrame((_, delta) => {
    if (useWorldStore.getState().isPaused || !groupRef.current) return;

    // Move
    const car = groupRef.current;
    car.position.x += data.direction.x * data.speed * delta;
    car.position.z += data.direction.z * data.speed * delta;

    // Wrap around
    if (data.roadAxis === 'x') {
      if (car.position.x > halfSpan) car.position.x = -halfSpan;
      if (car.position.x < -halfSpan) car.position.x = halfSpan;
    } else {
      if (car.position.z > halfSpan) car.position.z = -halfSpan;
      if (car.position.z < -halfSpan) car.position.z = halfSpan;
    }
  });

  // Face direction
  const angle = data.roadAxis === 'x'
    ? (data.direction.x > 0 ? 0 : Math.PI)
    : (data.direction.z > 0 ? Math.PI / 2 : -Math.PI / 2);

  const fwd = new THREE.Vector3(
    data.roadAxis === 'x' ? data.direction.x : 0,
    0,
    data.roadAxis === 'z' ? data.direction.z : 0
  ).normalize();

  const headlightTarget = data.position.clone().add(fwd.clone().multiplyScalar(15));

  return (
    <group ref={groupRef} position={[data.position.x, 0, data.position.z]} rotation={[0, -angle, 0]}>
      {/* Car body */}
      <mesh castShadow position={[0, t.bodyH / 2, 0]}>
        <boxGeometry args={[t.bodyW, t.bodyH, t.bodyD]} />
        <meshStandardMaterial color={data.color} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Roof / cabin */}
      {t.roofH > 0 && (
        <mesh castShadow position={[t.roofOffset, t.bodyH + t.roofH / 2 - 0.05, 0]}>
          <boxGeometry args={[t.roofW, t.roofH, t.roofD]} />
          <meshStandardMaterial color={data.color} roughness={0.3} metalness={0.6} />
        </mesh>
      )}

      {/* Windows (glass panels) */}
      {t.roofH > 0 && (
        <>
          {/* Front windshield */}
          <mesh position={[t.roofOffset + t.roofW / 2 + 0.01, t.bodyH + t.roofH * 0.45, 0]}>
            <planeGeometry args={[t.roofD - 0.1, t.roofH * 0.7]} />
            <meshStandardMaterial
              color="#88bbee"
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.6}
            />
          </mesh>
          {/* Rear windshield */}
          <mesh position={[t.roofOffset - t.roofW / 2 - 0.01, t.bodyH + t.roofH * 0.45, 0]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[t.roofD - 0.1, t.roofH * 0.7]} />
            <meshStandardMaterial
              color="#88bbee"
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.6}
            />
          </mesh>
          {/* Side windows */}
          <mesh position={[t.roofOffset, t.bodyH + t.roofH * 0.45, t.roofD / 2 + 0.01]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[t.roofW - 0.1, t.roofH * 0.6]} />
            <meshStandardMaterial
              color="#88bbee"
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.5}
            />
          </mesh>
          <mesh position={[t.roofOffset, t.bodyH + t.roofH * 0.45, -t.roofD / 2 - 0.01]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[t.roofW - 0.1, t.roofH * 0.6]} />
            <meshStandardMaterial
              color="#88bbee"
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}

      {/* Wheels */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([wx, wz], wi) => (
        <mesh key={wi} position={[wx * (t.bodyW * 0.35), t.wheelR, wz * (t.bodyD / 2 + 0.05)]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[t.wheelR, t.wheelR, 0.2, 12]} />
          <meshStandardMaterial color="#222222" roughness={0.9} />
        </mesh>
      ))}

      {/* Headlights */}
      <mesh position={[t.bodyW / 2 + 0.01, t.bodyH * 0.6, t.bodyD * 0.35]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial
          color={isNight ? '#ffffff' : '#cccccc'}
          emissive={isNight ? '#ffffcc' : '#000000'}
          emissiveIntensity={isNight ? 3 : 0}
        />
      </mesh>
      <mesh position={[t.bodyW / 2 + 0.01, t.bodyH * 0.6, -t.bodyD * 0.35]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial
          color={isNight ? '#ffffff' : '#cccccc'}
          emissive={isNight ? '#ffffcc' : '#000000'}
          emissiveIntensity={isNight ? 3 : 0}
        />
      </mesh>

      {/* Taillights */}
      <mesh position={[-t.bodyW / 2 - 0.01, t.bodyH * 0.6, t.bodyD * 0.35]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial
          color="#cc0000"
          emissive="#ff0000"
          emissiveIntensity={isNight ? 1.5 : 0.3}
        />
      </mesh>
      <mesh position={[-t.bodyW / 2 - 0.01, t.bodyH * 0.6, -t.bodyD * 0.35]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial
          color="#cc0000"
          emissive="#ff0000"
          emissiveIntensity={isNight ? 1.5 : 0.3}
        />
      </mesh>

      {/* Headlight beams (night only) */}
      {isNight && (
        <>
          <spotLight
            ref={headlightLeftRef}
            position={[t.bodyW / 2 + 0.1, t.bodyH * 0.6, t.bodyD * 0.35]}
            target-position={[t.bodyW / 2 + 15, 0, t.bodyD * 0.35]}
            intensity={2}
            distance={25}
            angle={0.4}
            penumbra={0.5}
            color="#ffffdd"
          />
          <spotLight
            ref={headlightRightRef}
            position={[t.bodyW / 2 + 0.1, t.bodyH * 0.6, -t.bodyD * 0.35]}
            target-position={[t.bodyW / 2 + 15, 0, -t.bodyD * 0.35]}
            intensity={2}
            distance={25}
            angle={0.4}
            penumbra={0.5}
            color="#ffffdd"
          />
        </>
      )}

      {/* Taillight glow (night) */}
      {isNight && (
        <>
          <pointLight ref={tailLeftRef} position={[-t.bodyW / 2 - 0.2, t.bodyH * 0.6, t.bodyD * 0.35]} intensity={0.5} distance={5} color="#ff3333" />
          <pointLight ref={tailRightRef} position={[-t.bodyW / 2 - 0.2, t.bodyH * 0.6, -t.bodyD * 0.35]} intensity={0.5} distance={5} color="#ff3333" />
        </>
      )}
    </group>
  );
}

/* ─── Cars Manager ─── */
export default function Cars() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;

  const cars = useMemo(() => generateCars(), []);

  return (
    <group>
      {cars.map((car, i) => (
        <Car key={`car-${i}`} data={car} isNight={isNight} />
      ))}
    </group>
  );
}
