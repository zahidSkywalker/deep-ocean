'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── NPC Pedestrians walking on sidewalks ─── */
const NPC_COUNT = 60;
const BLOCK_SIZE = 40;
const STREET_WIDTH = 16;
const GRID_RANGE = 4;
const TOTAL_SPAN = (GRID_RANGE * 2 + 1) * (BLOCK_SIZE + STREET_WIDTH);

const CLOTHING_COLORS = [
  '#cc3333', '#3366cc', '#339933', '#cc9933', '#9933cc',
  '#333333', '#666666', '#cc6633', '#339999', '#993366',
  '#ff6699', '#6699ff', '#ffcc00', '#00cccc', '#cc66ff',
  '#ffffff', '#e0e0e0', '#8b4513', '#2f4f4f', '#dc143c',
];

const SKIN_COLORS = ['#f5d0a9', '#d4a574', '#c68642', '#8d5524', '#f0c8a0', '#e8b88a', '#b8860b'];

interface NPCData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  clothingColor: THREE.Color;
  skinColor: THREE.Color;
  bodyHeight: number;
  walkPhase: number;
  walkSpeed: number;
  roadAxis: 'x' | 'z';
  roadIndex: number;
  side: -1 | 1;
  basePos: number;
  axis: number;
}

function generateNPCs(): NPCData[] {
  const npcs: NPCData[] = [];
  const rng = (s: number) => {
    const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < NPC_COUNT; i++) {
    const seed = i * 17 + 3;
    const roadAxis = rng(seed) > 0.5 ? 'x' : 'z';
    const roadIdx = Math.floor(rng(seed + 1) * (GRID_RANGE * 2 + 2)) - GRID_RANGE;
    const side: -1 | 1 = rng(seed + 2) > 0.5 ? 1 : -1;
    const basePos = roadIdx * (BLOCK_SIZE + STREET_WIDTH) - STREET_WIDTH / 2;

    // Position along the road
    const along = (rng(seed + 3) - 0.5) * TOTAL_SPAN;
    // Offset to sidewalk (edge of road)
    const sidewalkOffset = side * (STREET_WIDTH / 2 + 1.5);

    const speed = 0.8 + rng(seed + 4) * 1.2;
    const bodyHeight = 0.85 + rng(seed + 5) * 0.35;

    let pos: THREE.Vector3;
    let dir: THREE.Vector3;

    if (roadAxis === 'x') {
      // Walking along X axis
      pos = new THREE.Vector3(along, 0, basePos + sidewalkOffset);
      dir = new THREE.Vector3(side > 0 ? 1 : -1, 0, 0);
    } else {
      // Walking along Z axis
      pos = new THREE.Vector3(basePos + sidewalkOffset, 0, along);
      dir = new THREE.Vector3(0, 0, side > 0 ? 1 : -1);
    }

    npcs.push({
      position: pos,
      direction: dir,
      speed,
      clothingColor: new THREE.Color(CLOTHING_COLORS[Math.floor(rng(seed + 6) * CLOTHING_COLORS.length)]),
      skinColor: new THREE.Color(SKIN_COLORS[Math.floor(rng(seed + 7) * SKIN_COLORS.length)]),
      bodyHeight,
      walkPhase: rng(seed + 8) * Math.PI * 2,
      walkSpeed: 3 + rng(seed + 9) * 2,
      roadAxis,
      roadIndex: roadIdx,
      side,
      basePos,
      axis: roadAxis === 'x' ? 0 : 2, // component index in position vector
    });
  }

  return npcs;
}

export default function NPCs() {
  const isPaused = useWorldStore((s) => s.isPaused);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const legLeftRef = useRef<THREE.InstancedMesh>(null);
  const legRightRef = useRef<THREE.InstancedMesh>(null);
  const armLeftRef = useRef<THREE.InstancedMesh>(null);
  const armRightRef = useRef<THREE.InstancedMesh>(null);

  const npcs = useMemo(() => generateNPCs(), []);

  // Instance colors for body and head
  const bodyColors = useMemo(() => {
    const colors = new Float32Array(NPC_COUNT * 3);
    for (let i = 0; i < NPC_COUNT; i++) {
      colors[i * 3] = npcs[i].clothingColor.r;
      colors[i * 3 + 1] = npcs[i].clothingColor.g;
      colors[i * 3 + 2] = npcs[i].clothingColor.b;
    }
    return colors;
  }, [npcs]);

  const headColors = useMemo(() => {
    const colors = new Float32Array(NPC_COUNT * 3);
    for (let i = 0; i < NPC_COUNT; i++) {
      colors[i * 3] = npcs[i].skinColor.r;
      colors[i * 3 + 1] = npcs[i].skinColor.g;
      colors[i * 3 + 2] = npcs[i].skinColor.b;
    }
    return colors;
  }, [npcs]);

  const skinColors = useMemo(() => {
    const colors = new Float32Array(NPC_COUNT * 3);
    for (let i = 0; i < NPC_COUNT; i++) {
      colors[i * 3] = npcs[i].skinColor.r;
      colors[i * 3 + 1] = npcs[i].skinColor.g;
      colors[i * 3 + 2] = npcs[i].skinColor.b;
    }
    return colors;
  }, [npcs]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfExtent = TOTAL_SPAN / 2 + 20;

  // Set instance colors once
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.instanceColor = new THREE.InstancedBufferAttribute(bodyColors, 3);
    }
    if (headRef.current) {
      headRef.current.instanceColor = new THREE.InstancedBufferAttribute(headColors, 3);
    }
    if (legLeftRef.current) {
      legLeftRef.current.instanceColor = new THREE.InstancedBufferAttribute(skinColors, 3);
    }
    if (legRightRef.current) {
      legRightRef.current.instanceColor = new THREE.InstancedBufferAttribute(skinColors, 3);
    }
    if (armLeftRef.current) {
      armLeftRef.current.instanceColor = new THREE.InstancedBufferAttribute(bodyColors, 3);
    }
    if (armRightRef.current) {
      armRightRef.current.instanceColor = new THREE.InstancedBufferAttribute(bodyColors, 3);
    }
  }, [bodyColors, headColors, skinColors]);

  useFrame((_, delta) => {
    if (isPaused) return;

    for (let i = 0; i < NPC_COUNT; i++) {
      const npc = npcs[i];
      // Move NPC
      npc.position.x += npc.direction.x * npc.speed * delta;
      npc.position.z += npc.direction.z * npc.speed * delta;

      // Wrap around
      if (npc.roadAxis === 'x') {
        if (npc.position.x > halfExtent) npc.position.x = -halfExtent;
        if (npc.position.x < -halfExtent) npc.position.x = halfExtent;
      } else {
        if (npc.position.z > halfExtent) npc.position.z = -halfExtent;
        if (npc.position.z < -halfExtent) npc.position.z = halfExtent;
      }

      // Walk animation
      npc.walkPhase += npc.walkSpeed * delta;
      const walkCycle = Math.sin(npc.walkPhase);
      const isWalking = Math.abs(walkCycle) > 0.05;

      // Face walking direction
      const angle = Math.atan2(npc.direction.z, npc.direction.x);

      // Body (torso)
      dummy.position.set(npc.position.x, npc.bodyHeight + 0.5, npc.position.z);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.scale.set(0.35, npc.bodyHeight * 0.55, 0.25);
      dummy.updateMatrix();
      bodyRef.current?.setMatrixAt(i, dummy.matrix);

      // Head
      dummy.position.set(npc.position.x, npc.bodyHeight + 1.1, npc.position.z);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.scale.set(0.22, 0.22, 0.22);
      dummy.updateMatrix();
      headRef.current?.setMatrixAt(i, dummy.matrix);

      // Legs (animated swing)
      const legSwing = walkCycle * 0.4;

      // Left leg
      dummy.position.set(
        npc.position.x + Math.sin(angle + Math.PI / 4) * 0.1,
        npc.bodyHeight * 0.35,
        npc.position.z + Math.cos(angle + Math.PI / 4) * 0.1
      );
      dummy.rotation.set(legSwing, 0, 0);
      dummy.scale.set(0.12, npc.bodyHeight * 0.4, 0.12);
      dummy.updateMatrix();
      legLeftRef.current?.setMatrixAt(i, dummy.matrix);

      // Right leg
      dummy.position.set(
        npc.position.x + Math.sin(angle - Math.PI / 4) * 0.1,
        npc.bodyHeight * 0.35,
        npc.position.z + Math.cos(angle - Math.PI / 4) * 0.1
      );
      dummy.rotation.set(-legSwing, 0, 0);
      dummy.scale.set(0.12, npc.bodyHeight * 0.4, 0.12);
      dummy.updateMatrix();
      legRightRef.current?.setMatrixAt(i, dummy.matrix);

      // Arms (animated swing opposite to legs)
      const armSwing = -walkCycle * 0.35;

      // Left arm
      dummy.position.set(
        npc.position.x + Math.sin(angle + Math.PI / 4) * 0.25,
        npc.bodyHeight + 0.75,
        npc.position.z + Math.cos(angle + Math.PI / 4) * 0.25
      );
      dummy.rotation.set(armSwing, 0, 0);
      dummy.scale.set(0.08, 0.3, 0.08);
      dummy.updateMatrix();
      armLeftRef.current?.setMatrixAt(i, dummy.matrix);

      // Right arm
      dummy.position.set(
        npc.position.x + Math.sin(angle - Math.PI / 4) * 0.25,
        npc.bodyHeight + 0.75,
        npc.position.z + Math.cos(angle - Math.PI / 4) * 0.25
      );
      dummy.rotation.set(-armSwing, 0, 0);
      dummy.scale.set(0.08, 0.3, 0.08);
      dummy.updateMatrix();
      armRightRef.current?.setMatrixAt(i, dummy.matrix);
    }

    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
    if (legLeftRef.current) legLeftRef.current.instanceMatrix.needsUpdate = true;
    if (legRightRef.current) legRightRef.current.instanceMatrix.needsUpdate = true;
    if (armLeftRef.current) armLeftRef.current.instanceMatrix.needsUpdate = true;
    if (armRightRef.current) armRightRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Body (torso) */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, NPC_COUNT]} castShadow>
        <capsuleGeometry args={[1, 1, 4, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* Head */}
      <instancedMesh ref={headRef} args={[undefined, undefined, NPC_COUNT]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>

      {/* Left Leg */}
      <instancedMesh ref={legLeftRef} args={[undefined, undefined, NPC_COUNT]}>
        <capsuleGeometry args={[1, 1, 4, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* Right Leg */}
      <instancedMesh ref={legRightRef} args={[undefined, undefined, NPC_COUNT]}>
        <capsuleGeometry args={[1, 1, 4, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* Left Arm */}
      <instancedMesh ref={armLeftRef} args={[undefined, undefined, NPC_COUNT]}>
        <capsuleGeometry args={[1, 1, 4, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* Right Arm */}
      <instancedMesh ref={armRightRef} args={[undefined, undefined, NPC_COUNT]}>
        <capsuleGeometry args={[1, 1, 4, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
