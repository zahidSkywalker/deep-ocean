'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

const NUM_MOLECULES = 30;
const CYLINDER_RADIUS = 0.75;
const CYLINDER_BOTTOM = -1.0;
const CYLINDER_HEIGHT = 3.2;
const NUM_HEAT_PARTICLES = 4;

/* ── Seeded pseudo-random for stable initialisation ──────────────── */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ── Scene ───────────────────────────────────────────────────────── */
function ThermoScene() {
  const pistonRef = useRef<THREE.Mesh>(null);
  const moleculePointsRef = useRef<THREE.Points>(null);
  const hotParticleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const coldParticleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pistonPhase = useRef(0);
  const heatTimeRef = useRef(0);

  const { params, isPlaying } = useLabStore();
  const topicId = 'thermo';
  const p = params[topicId] || {};

  const tempHot = p.tempHot ?? 600;
  const tempCold = p.tempCold ?? 300;
  const moles = p.moles ?? 1;

  const efficiency = ((1 - tempCold / tempHot) * 100).toFixed(1);
  const heatInput = (tempHot * moles * 8.314).toFixed(0);
  const heatOutput = (tempCold * moles * 8.314).toFixed(0);
  const workDone = (tempHot * moles * 8.314 - tempCold * moles * 8.314).toFixed(0);

  const intensityFactor = (tempHot - 300) / 700;

  /* ── Pipe layout (connects reservoir faces → cylinder top) ───── */
  const cylinderTop = CYLINDER_BOTTOM + CYLINDER_HEIGHT; // 2.2
  const pipeY = cylinderTop;                             // level with top
  const hotResX = 3.0;
  const coldResX = -3.0;
  const hotPipeStart = hotResX - 0.65;
  const hotPipeEnd = CYLINDER_RADIUS + 0.05;
  const coldPipeStart = coldResX + 0.65;
  const coldPipeEnd = -(CYLINDER_RADIUS + 0.05);
  const hotPipeLen = hotPipeStart - hotPipeEnd;
  const coldPipeLen = coldPipeStart - coldPipeEnd;

  /* ── Pre-generate molecule initial data (no Math.random in JSX!) ─ */
  const moleculeInit = useMemo(() => {
    const positions: [number, number, number][] = [];
    const velocities: [number, number, number][] = [];

    for (let i = 0; i < NUM_MOLECULES; i++) {
      const angle = seededRandom(i * 3 + 1) * Math.PI * 2;
      const r = 0.15 + seededRandom(i * 3 + 2) * (CYLINDER_RADIUS - 0.2);
      const y = CYLINDER_BOTTOM + 0.15 + seededRandom(i * 3 + 3) * (CYLINDER_HEIGHT * 0.5);
      positions.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);

      const speed = 0.8 + seededRandom(i * 7 + 5) * 1.5;
      const vAngle = seededRandom(i * 11 + 7) * Math.PI * 2;
      const vPitch = (seededRandom(i * 13 + 11) - 0.5) * 1.2;
      velocities.push([
        speed * Math.cos(vAngle) * Math.cos(vPitch),
        speed * Math.sin(vPitch),
        speed * Math.sin(vAngle) * Math.cos(vPitch),
      ]);
    }

    return { positions, velocities };
  }, []);

  /* ── Buffer geometry for molecules ────────────────────────────── */
  const moleculeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(NUM_MOLECULES * 3);
    const col = new Float32Array(NUM_MOLECULES * 3);

    for (let i = 0; i < NUM_MOLECULES; i++) {
      pos[i * 3] = moleculeInit.positions[i][0];
      pos[i * 3 + 1] = moleculeInit.positions[i][1];
      pos[i * 3 + 2] = moleculeInit.positions[i][2];
      // warm yellow colour
      col[i * 3] = 0.98;
      col[i * 3 + 1] = 0.75;
      col[i * 3 + 2] = 0.15;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, [moleculeInit]);

  /* ── Mutable animation state stored in ref ──────────────────────── */
  const molStateRef = useRef<{
    pos: Float32Array;
    vel: [number, number, number][];
  } | null>(null);

  useEffect(() => {
    molStateRef.current = {
      pos: new Float32Array(NUM_MOLECULES * 3),
      vel: moleculeInit.velocities.map((v) => [...v] as [number, number, number]),
    };
    // Copy initial positions
    for (let i = 0; i < NUM_MOLECULES; i++) {
      molStateRef.current.pos[i * 3] = moleculeInit.positions[i][0];
      molStateRef.current.pos[i * 3 + 1] = moleculeInit.positions[i][1];
      molStateRef.current.pos[i * 3 + 2] = moleculeInit.positions[i][2];
    }
  }, [moleculeInit]);

  /* ── useFrame — piston + molecules + heat particles ────────────── */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // ─ Piston ─
    if (isPlaying) pistonPhase.current += dt * 2;
    if (pistonRef.current) {
      pistonRef.current.position.y = 1.0 + Math.sin(pistonPhase.current) * 0.55;
    }

    const pistonY = pistonRef.current ? pistonRef.current.position.y : 1.0;
    const tempFactor = Math.sqrt(tempHot / 300);

    // ─ Molecules ─
    if (isPlaying && molStateRef.current && moleculePointsRef.current) {
      const st = molStateRef.current;
      const posAttr = moleculePointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < NUM_MOLECULES; i++) {
        let x = st.pos[i * 3];
        let y = st.pos[i * 3 + 1];
        let z = st.pos[i * 3 + 2];

        // Integrate position
        x += st.vel[i][0] * tempFactor * dt;
        y += st.vel[i][1] * tempFactor * dt;
        z += st.vel[i][2] * tempFactor * dt;

        // Bounce off cylinder wall (circular boundary)
        const r = Math.sqrt(x * x + z * z);
        if (r > CYLINDER_RADIUS - 0.04) {
          const nx = x / r;
          const nz = z / r;
          const dot = st.vel[i][0] * nx + st.vel[i][2] * nz;
          st.vel[i][0] -= 2 * dot * nx;
          st.vel[i][2] -= 2 * dot * nz;
          const pushR = CYLINDER_RADIUS - 0.06;
          x = nx * pushR;
          z = nz * pushR;
        }

        // Bounce off piston (top)
        if (y > pistonY - 0.12) {
          st.vel[i][1] = -Math.abs(st.vel[i][1]);
          y = pistonY - 0.13;
        }
        // Bounce off bottom
        if (y < CYLINDER_BOTTOM + 0.05) {
          st.vel[i][1] = Math.abs(st.vel[i][1]);
          y = CYLINDER_BOTTOM + 0.06;
        }

        st.pos[i * 3] = x;
        st.pos[i * 3 + 1] = y;
        st.pos[i * 3 + 2] = z;
        posAttr.array[i * 3] = x;
        posAttr.array[i * 3 + 1] = y;
        posAttr.array[i * 3 + 2] = z;
      }
      posAttr.needsUpdate = true;
    }

    // ─ Heat-flow particles ─
    if (isPlaying) heatTimeRef.current += dt * 0.6;

    for (let i = 0; i < NUM_HEAT_PARTICLES; i++) {
      // Hot pipe: reservoir → cylinder (left direction)
      const mesh = hotParticleRefs.current[i];
      if (mesh) {
        const t = ((i / NUM_HEAT_PARTICLES) + heatTimeRef.current) % 1;
        mesh.position.x = hotPipeStart - t * hotPipeLen;
        mesh.position.y = pipeY;
        mesh.position.z = 0;
      }
      // Cold pipe: cylinder → reservoir (right direction)
      const cmesh = coldParticleRefs.current[i];
      if (cmesh) {
        const t = ((i / NUM_HEAT_PARTICLES) + heatTimeRef.current) % 1;
        cmesh.position.x = coldPipeStart + t * coldPipeLen;
        cmesh.position.y = pipeY;
        cmesh.position.z = 0;
      }
    }
  });

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0, -0.3]}>
        {/* ── Engine cylinder — glass walls ──────────────────────── */}
        <mesh position={[0, CYLINDER_BOTTOM + CYLINDER_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, CYLINDER_HEIGHT, 20]} />
          <meshPhysicalMaterial
            color="#94a3b8"
            transparent
            opacity={0.12}
            roughness={0.05}
            metalness={0.1}
            transmission={0.7}
            thickness={0.5}
          />
        </mesh>

        {/* ── Metal piston ─────────────────────────────────────── */}
        <mesh ref={pistonRef} position={[0, 1.0, 0]} castShadow>
          <cylinderGeometry args={[CYLINDER_RADIUS - 0.04, CYLINDER_RADIUS - 0.04, 0.18, 20]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* ── Work indicator arrow above piston ──────────────────── */}
        <group position={[0, 1.8, 0]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
            <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.06, 0.14, 8]} />
            <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.4} />
          </mesh>
          <Html position={[0, 0.5, 0]} center>
            <span className="text-[11px] font-semibold" style={{ color: '#4ade80', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
              W
            </span>
          </Html>
        </group>

        {/* ── Gas molecules (buffer-based Points) ─────────────────── */}
        <points ref={moleculePointsRef} geometry={moleculeGeometry}>
          <pointsMaterial size={0.07} sizeAttenuation vertexColors transparent opacity={0.9} />
        </points>

        {/* ── Hot reservoir ──────────────────────────────────────── */}
        <mesh position={[hotResX, pipeY, 0]} castShadow>
          <boxGeometry args={[1.3, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.35 * intensityFactor}
            roughness={0.3}
          />
        </mesh>
        <Html position={[hotResX, pipeY + 0.85, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#fca5a5', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            T&#8336;={tempHot}K
          </span>
        </Html>

        {/* ── Cold reservoir ─────────────────────────────────────── */}
        <mesh position={[coldResX, pipeY, 0]} castShadow>
          <boxGeometry args={[1.3, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.25}
            roughness={0.3}
          />
        </mesh>
        <Html position={[coldResX, pipeY + 0.85, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#93c5fd', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            T&#8450;={tempCold}K
          </span>
        </Html>

        {/* ── Hot pipe (reservoir face → cylinder top) ────────────── */}
        <mesh position={[(hotPipeStart + hotPipeEnd) / 2, pipeY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, hotPipeLen, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.35} roughness={0.3} metalness={0.7} />
        </mesh>

        {/* ── Cold pipe (cylinder top → reservoir face) ─────────── */}
        <mesh position={[(coldPipeStart + coldPipeEnd) / 2, pipeY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, coldPipeLen, 8]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.35} roughness={0.3} metalness={0.7} />
        </mesh>

        {/* ── Heat-flow particles (hot pipe) ─────────────────────── */}
        {Array.from({ length: NUM_HEAT_PARTICLES }).map((_, i) => (
          <mesh
            key={`hp${i}`}
            ref={(el) => { hotParticleRefs.current[i] = el; }}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
          </mesh>
        ))}

        {/* ── Heat-flow particles (cold pipe) ────────────────────── */}
        {Array.from({ length: NUM_HEAT_PARTICLES }).map((_, i) => (
          <mesh
            key={`cp${i}`}
            ref={(el) => { coldParticleRefs.current[i] = el; }}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#67e8f9" emissive="#67e8f9" emissiveIntensity={0.8} />
          </mesh>
        ))}

        {/* ── Labels: Qh, Qc, η ────────────────────────────────── */}
        <Html position={[hotResX, pipeY - 0.85, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#fdba74', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            Q&#8336;={heatInput}J
          </span>
        </Html>
        <Html position={[coldResX, pipeY - 0.85, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#7dd3fc', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            Q&#8450;={heatOutput}J
          </span>
        </Html>
        <Html position={[0, CYLINDER_BOTTOM - 0.2, 0]} center>
          <span className="text-xs font-bold" style={{ color: '#fde047', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            \u03B7 = {efficiency}%
          </span>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, pipeY * 0.5, -0.3]} />
    </>
  );
}

/* ── Export ──────────────────────────────────────────────────────── */
export default function ThermoSimulation() {
  const { params } = useLabStore();
  const topicId = 'thermo';
  const p = params[topicId] || {};

  const tempHot = p.tempHot ?? 600;
  const tempCold = p.tempCold ?? 300;
  const moles = p.moles ?? 1;

  const efficiency = ((1 - tempCold / tempHot) * 100).toFixed(1);
  const heatIn = (tempHot * moles * 8.314).toFixed(0);
  const heatOut = (tempCold * moles * 8.314).toFixed(0);
  const workVal = (tempHot * moles * 8.314 - tempCold * moles * 8.314).toFixed(0);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Carnot Efficiency', expression: `\u03B7 = 1 - Tc/Th = ${efficiency}%` },
        { name: 'Ideal Gas', expression: 'PV = nRT' },
      ]}
      liveValues={[
        { label: '\u03B7', value: efficiency, unit: '%' },
        { label: 'Th', value: String(tempHot), unit: 'K' },
        { label: 'Tc', value: String(tempCold), unit: 'K' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [4, 3, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <ThermoScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
