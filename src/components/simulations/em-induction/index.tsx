'use client';

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

/* ── Copper coil using TubeGeometry helix ── */
function CopperCoil({ displayTurns }: { displayTurns: number }) {
  const geo = useMemo(() => {
    const coilRadius = 0.7;
    const tubeRadius = 0.025;
    const spacing = 0.09;
    const numTurns = Math.min(displayTurns, 15);
    const segmentsPerTurn = 48;
    const totalSegments = numTurns * segmentsPerTurn;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= totalSegments; i++) {
      const t = i / totalSegments;
      const angle = t * numTurns * Math.PI * 2;
      const x = coilRadius * Math.cos(angle);
      const z = coilRadius * Math.sin(angle);
      const y = t * numTurns * spacing - (numTurns * spacing) / 2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, totalSegments * 2, tubeRadius, 8, false);
  }, [displayTurns]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#d97706"
        metalness={0.9}
        roughness={0.15}
        emissive="#d97706"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

/* ── Curved dipole field lines that follow the magnet ── */
function DipoleFieldLines({ magnetXRef }: { magnetXRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const linesData = useMemo(() => {
    const result: [number, number, number][][] = [];
    const numLines = 8;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const spreadFactor = 0.5 + (i % 4) * 0.25;
      const pts: [number, number, number][] = [];
      const segments = 48;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const theta = t * Math.PI;
        const r = spreadFactor * Math.sin(theta) * Math.sin(theta);
        const dy = Math.cos(theta) * 0.6;
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        pts.push([x, dy, z]);
      }

      result.push(pts);
    }

    return result;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = magnetXRef.current;
    }
  });

  return (
    <group ref={groupRef}>
      {linesData.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#fbbf24"
          lineWidth={1.2}
          transparent
          opacity={0.45}
        />
      ))}
    </group>
  );
}

/* ── Bar magnet ── */
function BarMagnet({ magnetRef }: { magnetRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={magnetRef} position={[2, 0, 0]}>
      {/* N pole (red) */}
      <mesh position={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.35]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.3}
          roughness={0.25}
          metalness={0.6}
        />
      </mesh>
      {/* S pole (blue) */}
      <mesh position={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.35]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.3}
          roughness={0.25}
          metalness={0.6}
        />
      </mesh>
      {/* Divider line */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.36, 0.36]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* N/S labels */}
      <Html position={[0.3, 0.28, 0]} center distanceFactor={6}>
        <span
          style={{
            color: '#ef4444',
            fontWeight: 'bold',
            fontSize: '13px',
            textShadow: '0 0 6px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          N
        </span>
      </Html>
      <Html position={[-0.3, 0.28, 0]} center distanceFactor={6}>
        <span
          style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            fontSize: '13px',
            textShadow: '0 0 6px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          S
        </span>
      </Html>
    </group>
  );
}

/* ── Galvanometer with semicircular meter and rotating needle ── */
function Galvanometer({ emfRef }: { emfRef: React.MutableRefObject<number> }) {
  const needleRef = useRef<THREE.Mesh>(null);
  const needleAngleRef = useRef(0);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!needleRef.current) return;

    const emf = emfRef.current;
    // Needle deflection proportional to EMF (capped)
    const maxAngle = Math.PI * 0.35;
    const targetAngle = Math.sign(emf) * Math.min(Math.abs(emf) * maxAngle, maxAngle);
    needleAngleRef.current += (targetAngle - needleAngleRef.current) * 0.12;
    needleRef.current.rotation.z = needleAngleRef.current;

    // Glow indicator
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = Math.min(Math.abs(emf) * 0.8, 1);
    }
  });

  return (
    <group position={[0, -1.2, 0]}>
      {/* Meter housing */}
      <mesh>
        <boxGeometry args={[0.8, 0.5, 0.15]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Meter face */}
      <group position={[0, 0.05, 0.08]}>
        {/* Background semicircle */}
        <mesh>
          <circleGeometry args={[0.32, 32, 0, Math.PI]} />
          <meshStandardMaterial
            color="#fefce8"
            roughness={0.9}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Scale arc */}
        <mesh>
          <torusGeometry args={[0.3, 0.008, 4, 32, Math.PI]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Major ticks and labels */}
        {[-1, -0.5, 0, 0.5, 1].map((frac, i) => {
          const angle = Math.PI * (0.5 + frac * 0.4);
          const x = Math.cos(angle) * 0.26;
          const y = Math.sin(angle) * 0.26;
          return (
            <group key={i}>
              <mesh position={[x, y, 0]}>
                <boxGeometry args={[0.004, 0.035, 0.002]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
              <Html
                position={[Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0.01]}
                center
                distanceFactor={4}
              >
                <span
                  style={{
                    color: '#475569',
                    fontSize: '7px',
                    fontWeight: '600',
                    pointerEvents: 'none',
                  }}
                >
                  {frac === 0 ? '0' : `${frac > 0 ? '+' : ''}${frac}`}
                </span>
              </Html>
            </group>
          );
        })}

        {/* Minor ticks */}
        {Array.from({ length: 21 }).map((_, i) => {
          const frac = (i / 20) * 2 - 1;
          const angle = Math.PI * (0.5 + frac * 0.4);
          const x = Math.cos(angle) * 0.28;
          const y = Math.sin(angle) * 0.28;
          return (
            <mesh key={`minor-${i}`} position={[x, y, 0]}>
              <boxGeometry args={[0.002, 0.02, 0.001]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          );
        })}

        {/* Needle */}
        <mesh ref={needleRef} position={[0, 0, 0.002]}>
          <boxGeometry args={[0.005, 0.27, 0.002]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Pivot */}
        <mesh position={[0, 0, 0.003]}>
          <circleGeometry args={[0.012, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      </group>

      {/* Glow indicator light */}
      <mesh ref={glowRef} position={[0, -0.15, 0.08]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#fde047"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Label */}
      <Html position={[0, 0.35, 0.1]} center distanceFactor={5}>
        <span
          style={{
            color: '#94a3b8',
            fontWeight: 'bold',
            fontSize: '10px',
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          Galvanometer
        </span>
      </Html>
    </group>
  );
}

/* ── Wire connections from coil to galvanometer ── */
function WireConnections() {
  const wireColor = '#4ade80';
  const points1: [number, number, number][] = [
    [-0.7, -0.3, 0],
    [-0.7, -0.8, 0],
    [-0.35, -1.2, 0],
  ];
  const points2: [number, number, number][] = [
    [0.7, -0.3, 0],
    [0.7, -0.8, 0],
    [0.35, -1.2, 0],
  ];

  return (
    <group>
      <Line points={points1} color={wireColor} lineWidth={2} />
      <Line points={points2} color={wireColor} lineWidth={2} />
    </group>
  );
}

/* ── Main scene ── */
function EMInductionScene() {
  const magnetRef = useRef<THREE.Group>(null);
  const magnetXRef = useRef(2);
  const magnetVelRef = useRef(0);
  const directionRef = useRef(-1);
  const emfRef = useRef(0);

  const { params, isPlaying } = useLabStore();
  const topicId = 'em-induction';
  const p = params[topicId] || {};

  const magnetSpeed = p.magnetSpeed ?? 2;
  const turns = p.turns ?? 50;
  const magneticField = p.magneticField ?? 0.5;
  const coilArea = p.coilArea ?? 0.1;

  const displayTurns = Math.min(turns, 15);
  const emfScale = turns * magneticField * coilArea;

  // State synced from ref for display (updated via useEffect interval)
  const [displayEmf, setDisplayEmf] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayEmf(emfRef.current);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useFrame((_, delta) => {
    if (!isPlaying || !magnetRef.current) return;

    const speed = magnetSpeed * 0.4;

    // Bounce boundaries
    if (magnetXRef.current > 2.5) {
      directionRef.current = -1;
    } else if (magnetXRef.current < -2.5) {
      directionRef.current = 1;
    }

    magnetXRef.current += speed * delta * directionRef.current;
    magnetVelRef.current = speed * directionRef.current;

    // Position magnet
    magnetRef.current.position.x = magnetXRef.current;

    // EMF proportional to velocity × proximity to coil
    const distFromCoil = Math.abs(magnetXRef.current);
    const proximityFactor = Math.max(0, 1 - distFromCoil / 2.5);
    emfRef.current = magnetVelRef.current * proximityFactor * emfScale * 0.3;
  });

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0.5, -0.3]}>
        {/* Copper coil */}
        <CopperCoil displayTurns={displayTurns} />

        {/* Bar magnet */}
        <BarMagnet magnetRef={magnetRef} />

        {/* Dipole field lines follow the magnet */}
        <DipoleFieldLines magnetXRef={magnetXRef} />

        {/* Wire connections */}
        <WireConnections />

        {/* Galvanometer */}
        <Galvanometer emfRef={emfRef} />

        {/* Info labels */}
        <Html position={[-2.5, 2.2, 0]} distanceFactor={8}>
          <div
            style={{
              color: '#fde047',
              fontSize: '11px',
              fontWeight: '600',
              textShadow: '0 0 4px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            <div>ε = {displayEmf.toFixed(3)} V</div>
            <div>N = {turns} turns</div>
            <div>B = {magneticField} T</div>
          </div>
        </Html>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        makeDefault
        target={[0, 0.5, -0.3]}
      />
    </>
  );
}

export default function EMInductionSimulation() {
  const { params } = useLabStore();
  const topicId = 'em-induction';
  const p = params[topicId] || {};

  const magnetSpeed = p.magnetSpeed ?? 2;
  const turns = p.turns ?? 50;
  const magneticField = p.magneticField ?? 0.5;
  const coilArea = p.coilArea ?? 0.1;
  const flux = (magneticField * coilArea).toFixed(3);
  const emf = (magnetSpeed * turns * magneticField * coilArea).toFixed(3);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: "Faraday's Law", expression: 'ε = -dΦ/dt = NBAv' },
        { name: 'Flux', expression: `Φ = BA = ${flux} Wb` },
      ]}
      liveValues={[
        { label: 'EMF', value: emf, unit: 'V' },
        { label: 'N', value: String(turns), unit: '' },
        { label: 'B', value: String(magneticField), unit: 'T' },
      ]}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [3, 2, 4], fov: 50 }}
      >
        <Suspense fallback={null}>
          <EMInductionScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
