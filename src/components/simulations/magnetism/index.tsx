'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

/* ── Helix solenoid coil as a single TubeGeometry ── */
function SolenoidCoil({ turns, current }: { turns: number; current: number }) {
  const geo = useMemo(() => {
    const coilRadius = 0.5;
    const tubeRadius = 0.025;
    const numTurns = Math.min(turns, 30);
    const solenoidLength = 3;
    const segmentsPerTurn = 32;
    const totalSegments = numTurns * segmentsPerTurn;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= totalSegments; i++) {
      const t = i / totalSegments;
      const angle = t * numTurns * Math.PI * 2;
      const x = coilRadius * Math.cos(angle);
      const z = coilRadius * Math.sin(angle);
      const y = t * solenoidLength - solenoidLength / 2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, totalSegments * 2, tubeRadius, 8, false);
  }, [turns]);

  const emissiveIntensity = Math.min(0.15 + current * 0.1, 0.8);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#d97706"
        metalness={0.9}
        roughness={0.15}
        emissive="#d97706"
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

/* ── Curved dipole magnetic field lines ── */
function MagneticFieldLines({ fieldStrength }: { fieldStrength: number }) {
  const lines = useMemo(() => {
    const result: { points: THREE.Vector3[]; radius: number }[] = [];
    const numLines = 6;
    const solenoidTop = 1.5;
    const solenoidBot = -1.5;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const spreadFactor = 0.6 + (i % 3) * 0.3;
      const pts: THREE.Vector3[] = [];
      const segments = 64;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        // Parametric dipole field line shape
        const theta = t * Math.PI; // 0 to PI for one half
        const r = spreadFactor * Math.sin(theta) * Math.sin(theta);
        const y = solenoidTop * Math.cos(theta);
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        pts.push(new THREE.Vector3(x, y, z));
      }

      result.push({ points: pts, radius: spreadFactor });
    }

    return result;
  }, []);

  const opacity = Math.min(0.3 + fieldStrength * 0.3, 0.8);

  return (
    <group>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color="#f472b6"
          lineWidth={1.5}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  );
}

/* ── Compass with N/S needles animated via ref ── */
function Compass({ fieldStrength, current }: { fieldStrength: number; current: number }) {
  const needleRef = useRef<THREE.Group>(null);
  const targetAngleRef = useRef(0);
  const currentAngleRef = useRef(0);

  useFrame(() => {
    if (!needleRef.current) return;
    const { isPlaying } = useLabStore.getState();

    if (isPlaying) {
      // Smoothly rotate toward the magnetic field direction
      targetAngleRef.current = Math.atan2(fieldStrength, 1);
    }

    // Smooth interpolation
    currentAngleRef.current += (targetAngleRef.current - currentAngleRef.current) * 0.05;
    needleRef.current.rotation.y = currentAngleRef.current;
    // Small wobble based on current
    needleRef.current.rotation.z = Math.sin(Date.now() * 0.001 * current) * 0.05;
  });

  return (
    <group position={[2.2, 0, 0]}>
      {/* Compass housing */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 24]} />
        <meshStandardMaterial color="#475569" roughness={0.25} metalness={0.7} />
      </mesh>
      {/* Glass top */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.02, 24]} />
        <meshStandardMaterial
          color="#94a3b8"
          transparent
          opacity={0.3}
          metalness={0.5}
          roughness={0.1}
        />
      </mesh>

      {/* Needle group */}
      <group ref={needleRef} position={[0, 0.05, 0]}>
        {/* North needle (red) - points up */}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.04, 0.22, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
        </mesh>
        {/* South needle (blue) - points down */}
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.22, 8]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
        {/* Center pivot */}
        <mesh>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Cardinal marks */}
      {[
        { pos: [0, 0.06, 0.3] as [number, number, number], label: 'N', color: '#ef4444' },
        { pos: [0, 0.06, -0.3] as [number, number, number], label: 'S', color: '#3b82f6' },
      ].map(({ pos, label, color }) => (
        <Html key={label} position={pos} center distanceFactor={6}>
          <span
            style={{
              color,
              fontWeight: 'bold',
              fontSize: '10px',
              textShadow: '0 0 3px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
            }}
          >
            {label}
          </span>
        </Html>
      ))}
    </group>
  );
}

/* ── N/S pole labels on solenoid ── */
function PoleLabels() {
  return (
    <group>
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <span
          style={{
            color: '#ef4444',
            fontWeight: 'bold',
            fontSize: '14px',
            textShadow: '0 0 6px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          N
        </span>
      </Html>
      <Html position={[0, -1.8, 0]} center distanceFactor={8}>
        <span
          style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            fontSize: '14px',
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

/* ── Main scene ── */
function MagnetismScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'magnetism';
  const p = params[topicId] || {};

  const current = p.current ?? 2;
  const turns = p.turns ?? 20;
  const distance = p.distance ?? 0.1;

  const magneticField = (4 * Math.PI * 1e-7 * turns * current) / (2 * distance);
  const scaledField = magneticField * 1e4;

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0.1, -0.3]}>
        {/* Solenoid helix coil */}
        <SolenoidCoil turns={turns} current={current} />

        {/* Iron core */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 3, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Curved magnetic field lines */}
        <MagneticFieldLines fieldStrength={scaledField} />

        {/* Pole labels */}
        <PoleLabels />

        {/* Compass */}
        <Compass fieldStrength={scaledField} current={current} />

        {/* Value labels */}
        <Html position={[-1.5, 2.2, 0]} distanceFactor={8}>
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
            <div>B = {scaledField.toFixed(2)} G</div>
            <div>I = {current} A</div>
            <div>n = {turns} turns</div>
          </div>
        </Html>
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        makeDefault
        target={[0, 0.1, -0.3]}
      />
    </>
  );
}

export default function MagnetismSimulation() {
  const { params } = useLabStore();
  const topicId = 'magnetism';
  const p = params[topicId] || {};

  const current = p.current ?? 2;
  const turns = p.turns ?? 20;
  const distance = p.distance ?? 0.1;
  const magneticField = (4 * Math.PI * 1e-7 * turns * current) / (2 * distance);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Magnetic Field', expression: `B = μ₀nI/(2r)` },
        { name: 'B value', expression: `${(magneticField * 1e4).toFixed(3)} Gauss` },
      ]}
      liveValues={[
        { label: 'B', value: magneticField.toExponential(2), unit: 'T' },
        { label: 'n', value: String(turns), unit: '' },
        { label: 'I', value: String(current), unit: 'A' },
      ]}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [4, 2, 4], fov: 50 }}
      >
        <Suspense fallback={null}>
          <MagnetismScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
