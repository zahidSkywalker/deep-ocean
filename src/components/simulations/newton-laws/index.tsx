'use client';

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';
import { Arrow3D } from '@/components/simulation/Arrow3D';

function MetalCart({ position }: { position: [number, number, number] }) {
  const [metalMap] = useTexture(['/textures/metal.png']);

  return (
    <group position={position}>
      {/* Cart body — top surface at y=0 when position.y=-0.15 */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.3, 0.8]} />
        <meshStandardMaterial map={metalMap} roughness={0.3} metalness={0.8} color="#94a3b8" />
      </mesh>
      {/* Wheels */}
      {([-0.4, 0.4] as const).map((x, i) =>
        ([0.42, -0.42] as const).map((z, j) => (
          <mesh key={`w-${i}-${j}`} position={[x, -0.2, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 12]} />
            <meshStandardMaterial map={metalMap} roughness={0.2} metalness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

function NewtonScene() {
  const groupRef = useRef<THREE.Group>(null);
  const { params, isPlaying } = useLabStore();
  const topicId = 'newton-laws';
  const p = params[topicId] || {};

  const mass = p.mass ?? 10;
  const force = p.force ?? 50;
  const frictionCoeff = p.friction ?? 0.3;

  const acceleration = force / mass;
  const frictionForce = frictionCoeff * mass * 9.8;
  const netForce = Math.max(0, force - frictionForce);
  const netAccel = netForce / mass;

  // Ref-based animation state (no setState in useFrame!)
  const posRef = useRef(0);
  const velRef = useRef(0);
  const resetTimerRef = useRef(0);
  const isResettingRef = useRef(false);
  const startXRef = useRef(0);

  // Track when params change to trigger reset
  const prevParamsRef = useRef({ mass, force, frictionCoeff });
  const shouldReset = useRef(false);

  useEffect(() => {
    if (
      prevParamsRef.current.mass !== mass ||
      prevParamsRef.current.force !== force ||
      prevParamsRef.current.frictionCoeff !== frictionCoeff
    ) {
      prevParamsRef.current = { mass, force, frictionCoeff };
      shouldReset.current = true;
    }
  }, [mass, force, frictionCoeff]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // If params changed, trigger smooth reset
    if (shouldReset.current) {
      shouldReset.current = false;
      isResettingRef.current = true;
      resetTimerRef.current = 0;
    }

    const dt = Math.min(delta, 0.05); // Clamp delta to prevent huge jumps

    if (isResettingRef.current) {
      // Smooth ease back to start
      resetTimerRef.current += dt * 2;
      const t = Math.min(resetTimerRef.current, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      posRef.current = startXRef.current * (1 - ease);
      velRef.current = 0;

      if (t >= 1) {
        isResettingRef.current = false;
        posRef.current = 0;
        velRef.current = 0;
      }
    } else if (isPlaying && netAccel > 0) {
      velRef.current += netAccel * dt * 0.05;
      posRef.current += velRef.current * dt;

      // Reached end — start smooth reset
      if (posRef.current > 8) {
        startXRef.current = posRef.current;
        isResettingRef.current = true;
        resetTimerRef.current = 0;
      }
    }

    const px = posRef.current;
    groupRef.current.position.x = px;
  });

  // Arrow lengths proportional to force magnitude
  const forceArrowLen = Math.max(0.5, (force / 50) * 1.5);
  const frictionArrowLen = frictionForce > 0 ? Math.max(0.3, (frictionForce / force) * forceArrowLen) : 0;

  // Block sits ON TOP of the cart (cart top at y=0, block half-height=0.25)
  const blockY = 0.25;

  return (
    <>
      <LabEnvironment variant="full" />

      <group position={[0, 0, -0.3]}>
        {/* Moving assembly: cart + block + arrows */}
        <group ref={groupRef} position={[0, -0.15, 0]}>
          <MetalCart position={[0, 0, 0]} />

          {/* Block on top of cart */}
          <mesh position={[0, blockY + 0.15, 0]} castShadow>
            <boxGeometry args={[0.7, 0.5, 0.5]} />
            <meshStandardMaterial color="#4ade80" roughness={0.3} metalness={0.5} />
          </mesh>

          {/* Applied Force Arrow (→) */}
          <Arrow3D
            start={[0.6, blockY + 0.15, 0]}
            end={[0.6 + forceArrowLen, blockY + 0.15, 0]}
            color="#fbbf24"
            shaftRadius={0.04}
            headRadius={0.1}
            headLength={0.2}
          />
          <Html position={[0.6 + forceArrowLen / 2, blockY + 0.45, 0]} center>
            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              F={force}N
            </span>
          </Html>

          {/* Friction Arrow (←) */}
          {frictionArrowLen > 0.05 && (
            <>
              <Arrow3D
                start={[-0.6, blockY + 0.15, 0]}
                end={[-0.6 - frictionArrowLen, blockY + 0.15, 0]}
                color="#ef4444"
                shaftRadius={0.03}
                headRadius={0.08}
                headLength={0.15}
              />
              <Html position={[-0.6 - frictionArrowLen / 2, blockY + 0.45, 0]} center>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
                  f={frictionForce.toFixed(1)}N
                </span>
              </Html>
            </>
          )}

          {/* Mass label */}
          <Html position={[0, blockY + 0.55, 0]} center>
            <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              {mass} kg
            </span>
          </Html>

          {/* Weight arrow (↓) */}
          <Arrow3D
            start={[0, -0.05, 0.3]}
            end={[0, -0.05 - 0.6, 0.3]}
            color="#a78bfa"
            shaftRadius={0.03}
            headRadius={0.08}
            headLength={0.12}
          />
          <Html position={[0, -0.05 - 0.7, 0.3]} center>
            <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: 11, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              mg={((mass * 9.8)).toFixed(0)}N
            </span>
          </Html>
        </group>

        {/* Ground reference line */}
        <mesh position={[4, -0.38, 0]}>
          <boxGeometry args={[10, 0.02, 0.6]} />
          <meshStandardMaterial color="#4ade80" transparent opacity={0.25} />
        </mesh>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0.3, -0.3]} />
    </>
  );
}

export default function NewtonLawsSimulation() {
  const { params } = useLabStore();
  const topicId = 'newton-laws';
  const p = params[topicId] || {};

  const mass = p.mass ?? 10;
  const force = p.force ?? 50;
  const friction = p.friction ?? 0.3;
  const frictionForce = friction * mass * 9.8;
  const netForceVal = Math.max(0, force - frictionForce);
  const accel = (netForceVal / mass).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: "Newton's 2nd Law", expression: 'F = ma' },
        { name: 'Friction', expression: `f = μN = ${friction} × ${mass} × 9.8` },
      ]}
      liveValues={[
        { label: 'a', value: accel, unit: 'm/s²' },
        { label: 'F_net', value: netForceVal.toFixed(1), unit: 'N' },
        { label: 'm', value: String(mass), unit: 'kg' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [4, 3, 4], fov: 50 }}>
        <Suspense fallback={null}>
          <NewtonScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
