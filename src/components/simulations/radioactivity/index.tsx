'use client';

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { SpaceEnvironment } from '@/components/simulation/SpaceEnvironment';

/* ── Pre-generated atom positions (Fibonacci sphere, memoized) ── */
function useAtomPositions(count: number) {
  return useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.55 + (i % 5) * 0.12;
      positions.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }
    return positions;
  }, [count]);
}

/* ── Pre-generated decay particle data ── */
function useDecayParticleData(count: number, decayType: number) {
  return useMemo(() => {
    const particles: {
      direction: [number, number, number];
      speed: number;
      color: string;
      size: number;
      phase: number;
    }[] = [];

    const colorMap = ['#facc15', '#60a5fa', '#c084fc'];
    const sizeMap = [0.09, 0.035, 0.018];
    const speedMap = [1.2, 2.5, 4.0];

    for (let i = 0; i < count; i++) {
      const seed1 = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      const seed2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
      const seed3 = Math.sin(i * 419.2 + 371.9) * 43758.5453;

      const phi = ((seed1 - Math.floor(seed1)) * 2 - 1) * Math.PI;
      const theta = (seed2 - Math.floor(seed2)) * Math.PI * 2;

      const dir: [number, number, number] = [
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      ];

      particles.push({
        direction: dir,
        speed: speedMap[decayType] * (0.8 + (seed3 - Math.floor(seed3)) * 0.4),
        color: colorMap[decayType],
        size: sizeMap[decayType],
        phase: seed1 - Math.floor(seed1),
      });
    }

    return particles;
  }, [count, decayType]);
}

/* ── Atom cluster with scale animation via refs ── */
function AtomCluster({
  positions,
  timeRef,
  decayConstant,
  initialAtoms,
}: {
  positions: [number, number, number][];
  timeRef: React.MutableRefObject<number>;
  decayConstant: number;
  initialAtoms: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scalesRef = useRef<Float32Array>(
    new Float32Array(positions.length).fill(1)
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const { isPlaying } = useLabStore.getState();
    if (!isPlaying) return;

    const remaining = Math.round(initialAtoms * Math.exp(-decayConstant * timeRef.current));

    // Update scales smoothly
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const target = i < remaining ? 1 : 0;
        scalesRef.current[i] += (target - scalesRef.current[i]) * Math.min(delta * 4, 1);
        const s = scalesRef.current[i];
        child.scale.set(s, s, s);
        child.visible = s > 0.01;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Decay particles (pre-generated, animated via refs) ── */
function DecayParticles({
  particles,
  activeRef,
}: {
  particles: {
    direction: [number, number, number];
    speed: number;
    color: string;
    size: number;
    phase: number;
  }[];
  activeRef: React.MutableRefObject<boolean>;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const progressRef = useRef<Float32Array>(
    new Float32Array(particles.map((p) => p.phase))
  );

  useFrame((_, delta) => {
    const { isPlaying } = useLabStore.getState();
    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      if (isPlaying && activeRef.current) {
        progressRef.current[i] += delta * p.speed * 0.25;
        if (progressRef.current[i] > 1) {
          progressRef.current[i] = 0;
        }
      }

      const prog = progressRef.current[i];
      const dist = prog * 3.5;
      mesh.position.set(
        p.direction[0] * dist,
        p.direction[1] * dist,
        p.direction[2] * dist
      );

      const opacity = Math.max(0, 1 - prog * 0.8);
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = opacity;
      }
    });
  });

  return (
    <group>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          position={[0, 0, 0]}
        >
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshStandardMaterial
            color={p.color}
            emissive={p.color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Lead shielding (hollow box, open top) ── */
function LeadShielding() {
  const t = 0.12;
  const size = 1.2;
  const h = size / 2;
  const matProps = { color: '#6b7280', roughness: 0.5, metalness: 0.7 };

  return (
    <group position={[0, 0, 0]}>
      {/* Bottom */}
      <mesh position={[0, -h, 0]}>
        <boxGeometry args={[size, t, size]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Left */}
      <mesh position={[-h, 0, 0]}>
        <boxGeometry args={[t, size, size]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Right */}
      <mesh position={[h, 0, 0]}>
        <boxGeometry args={[t, size, size]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0, -h]}>
        <boxGeometry args={[size + t * 2, size, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Front */}
      <mesh position={[0, 0, h]}>
        <boxGeometry args={[size + t * 2, size, t]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Pb label */}
      <Html position={[h + 0.15, 0, h]} distanceFactor={6}>
        <span
          style={{
            color: '#9ca3af',
            fontWeight: 'bold',
            fontSize: '10px',
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          Pb
        </span>
      </Html>
    </group>
  );
}

/* ── Geiger counter with animated needle ── */
function GeigerCounter({ activityRef }: { activityRef: React.MutableRefObject<number> }) {
  const needleRef = useRef<THREE.Mesh>(null);
  const needleAngleRef = useRef(0);

  useFrame(() => {
    if (!needleRef.current) return;

    const targetAngle =
      -Math.PI * 0.2 + Math.min(activityRef.current, 1) * Math.PI * 0.6;
    needleAngleRef.current += (targetAngle - needleAngleRef.current) * 0.08;
    needleRef.current.rotation.z = needleAngleRef.current;
  });

  return (
    <group position={[2.5, 0.4, 0]}>
      {/* Tube */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 1.4, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Window */}
      <mesh position={[-0.7, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Body with meter */}
      <mesh position={[1, 0, 0]}>
        <boxGeometry args={[0.5, 0.35, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Meter face */}
      <group position={[1, 0.05, 0.11]}>
        {/* Background */}
        <mesh>
          <circleGeometry args={[0.14, 24, 0, Math.PI]} />
          <meshStandardMaterial
            color="#fefce8"
            roughness={0.9}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Arc */}
        <mesh>
          <torusGeometry args={[0.13, 0.005, 4, 24, Math.PI]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const angle = Math.PI * 0.5 + frac * Math.PI;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.11, Math.sin(angle) * 0.11, 0]}>
              <boxGeometry args={[0.003, 0.025, 0.002]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          );
        })}
        {/* Needle */}
        <mesh ref={needleRef} position={[0, 0, 0.002]}>
          <boxGeometry args={[0.004, 0.12, 0.002]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Pivot */}
        <mesh position={[0, 0, 0.003]}>
          <circleGeometry args={[0.008, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      <Html position={[1, 0.28, 0.15]} distanceFactor={6}>
        <span
          style={{
            color: '#94a3b8',
            fontWeight: 'bold',
            fontSize: '9px',
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          Geiger
        </span>
      </Html>
    </group>
  );
}

/* ── Main scene ── */
function RadioactivityScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'radioactivity';
  const p = params[topicId] || {};

  const halfLife = p.halfLife ?? 10;
  const initialAtoms = p.initialAtoms ?? 100;
  const decayType = p.decayType ?? 0;

  const decayConstant = Math.log(2) / halfLife;

  // Pre-generate data
  const atomPositions = useAtomPositions(Math.min(initialAtoms, 100));
  const decayParticleData = useDecayParticleData(20, decayType);

  // Refs for animation state (NO setState in useFrame)
  const timeRef = useRef(0);
  const tickRef = useRef(0);
  const remainingRef = useRef(initialAtoms);
  const activeRef = useRef(false);
  const activityRef = useRef(0);

  // State synced from ref for display (updated via useEffect interval)
  const [displayRemaining, setDisplayRemaining] = useState(initialAtoms);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayRemaining(remainingRef.current);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useFrame((_, delta) => {
    if (!isPlaying) return;

    timeRef.current += delta;
    tickRef.current += delta;
    remainingRef.current = Math.round(
      initialAtoms * Math.exp(-decayConstant * timeRef.current)
    );
    activeRef.current = remainingRef.current < initialAtoms;
    activityRef.current = Math.min(
      (decayConstant * remainingRef.current) / initialAtoms * 3,
      1
    );

  });

  const decayNames = ['α', 'β', 'γ'];

  return (
    <>
      <SpaceEnvironment showStars={true} />

      <pointLight position={[0, 0, 0]} intensity={1.5} color="#ef4444" distance={4} />

      {/* Radioactive source core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {/* Lead shielding */}
      <LeadShielding />

      {/* Atoms */}
      <AtomCluster
        positions={atomPositions}
        timeRef={timeRef}
        decayConstant={decayConstant}
        initialAtoms={initialAtoms}
      />

      {/* Decay particles */}
      <DecayParticles particles={decayParticleData} activeRef={activeRef} />

      {/* Geiger counter */}
      <GeigerCounter activityRef={activityRef} />

      {/* Labels */}
      <Html position={[0, -1.6, 0.8]} center distanceFactor={7}>
        <div
          style={{
            color: '#fde047',
            fontSize: '11px',
            fontWeight: '600',
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          <div
            style={{
              color:
                decayType === 0
                  ? '#facc15'
                  : decayType === 1
                    ? '#60a5fa'
                    : '#c084fc',
            }}
          >
            {decayNames[decayType]}
          </div>
          <div>N₀ = {initialAtoms}</div>
          <div>N = {displayRemaining}</div>
          <div>t½ = {halfLife}s</div>
        </div>
      </Html>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault />
    </>
  );
}

export default function RadioactivitySimulation() {
  const { params } = useLabStore();
  const topicId = 'radioactivity';
  const p = params[topicId] || {};

  const halfLife = p.halfLife ?? 10;
  const initialAtoms = p.initialAtoms ?? 100;
  const decayType = p.decayType ?? 0;
  const decayNames = ['α (alpha)', 'β (beta)', 'γ (gamma)'];

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Decay Law', expression: 'N = N₀e^(-λt)' },
        { name: 'Half-life', expression: `t½ = ln(2)/λ = ${halfLife}s` },
      ]}
      liveValues={[
        { label: 'N₀', value: String(initialAtoms), unit: '' },
        { label: 't½', value: String(halfLife), unit: 's' },
        { label: 'Type', value: decayNames[decayType], unit: '' },
      ]}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 2, 6], fov: 50 }}
      >
        <Suspense fallback={null}>
          <RadioactivityScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
