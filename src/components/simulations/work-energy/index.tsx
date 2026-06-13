'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';
import { Arrow3D } from '@/components/simulation/Arrow3D';

function WorkEnergyScene() {
  const blockGroupRef = useRef<THREE.Group>(null);
  const { params, isPlaying } = useLabStore();
  const topicId = 'work-energy';
  const p = params[topicId] || {};

  const mass = p.mass ?? 10;
  const inclineAngle = p.inclineAngle ?? 30;
  const height = p.height ?? 10;
  const friction = p.friction ?? 0.2;

  const angleRad = (inclineAngle * Math.PI) / 180;
  const inclineLength = height / Math.sin(angleRad);
  const weight = mass * 9.8;
  const normalForce = weight * Math.cos(angleRad);
  const frictionForce = friction * normalForce;
  const gravityComponent = weight * Math.sin(angleRad);
  const netForce = gravityComponent - frictionForce;
  const acceleration = netForce > 0 ? netForce / mass : 0;

  // Visual scale: fit the ramp into a nice size
  const slopeScale = 6 / Math.max(inclineLength, 1);
  const scaledLength = inclineLength * slopeScale;
  const scaledHeight = height * slopeScale;
  const baseWidth = height / Math.tan(angleRad) * slopeScale;

  // Ref-based animation (no setState in useFrame!)
  const distRef = useRef(0); // distance traveled along incline from top
  const velRef = useRef(0);
  const resetTimerRef = useRef(0);
  const isResettingRef = useRef(false);
  const startDistRef = useRef(0);

  // Track param changes for reset
  const prevParamsRef = useRef({ mass, inclineAngle, height, friction });
  const shouldReset = useRef(false);
  useEffect(() => {
    if (
      prevParamsRef.current.mass !== mass ||
      prevParamsRef.current.inclineAngle !== inclineAngle ||
      prevParamsRef.current.height !== height ||
      prevParamsRef.current.friction !== friction
    ) {
      prevParamsRef.current = { mass, inclineAngle, height, friction };
      shouldReset.current = true;
    }
  }, [mass, inclineAngle, height, friction]);

  // Block size
  const blockSize = 0.5;

  // Incline surface normal direction (perpendicular, pointing away from ramp)
  // Ramp goes from bottom-left (baseWidth, 0) to top-left (0, scaledHeight)
  // Surface normal = (sin(angle), cos(angle), 0) pointing outward
  const nx = Math.sin(angleRad);
  const ny = Math.cos(angleRad);

  useFrame((_, delta) => {
    if (!blockGroupRef.current) return;

    if (shouldReset.current) {
      shouldReset.current = false;
      isResettingRef.current = true;
      resetTimerRef.current = 0;
    }

    const dt = Math.min(delta, 0.05);

    if (isResettingRef.current) {
      resetTimerRef.current += dt * 2;
      const t = Math.min(resetTimerRef.current, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      distRef.current = startDistRef.current * (1 - ease);
      velRef.current = 0;

      if (t >= 1) {
        isResettingRef.current = false;
        distRef.current = 0;
        velRef.current = 0;
      }
    } else if (isPlaying && acceleration > 0) {
      velRef.current += acceleration * dt * 0.03;
      distRef.current += velRef.current * dt;

      if (distRef.current > scaledLength - blockSize) {
        startDistRef.current = distRef.current;
        isResettingRef.current = true;
        resetTimerRef.current = 0;
      }
    }

    // Position the block ON the incline surface
    // Top of ramp is at (0, scaledHeight), block starts there
    // Moving down the incline by distRef:
    const d = distRef.current;
    const surfX = d * Math.cos(angleRad); // moving right
    const surfY = scaledHeight - d * Math.sin(angleRad); // moving down

    // Offset block center perpendicular to surface so it sits ON the ramp
    const halfBlock = blockSize * 0.5;
    const cx = surfX + nx * halfBlock;
    const cy = surfY + ny * halfBlock;

    blockGroupRef.current.position.set(cx, cy, 0);
    blockGroupRef.current.rotation.set(0, 0, -angleRad);
  });

  // Force arrow lengths (scaled for visibility)
  const arrowScale = 0.004;
  const weightLen = Math.min(weight * arrowScale, 2.5);
  const gravityCompLen = Math.min(gravityComponent * arrowScale, 2.0);
  const normalLen = Math.min(normalForce * arrowScale, 2.0);
  const frictionLen = Math.min(frictionForce * arrowScale, 1.5);

  // Ramp position: centered
  const rampCenterX = baseWidth * 0.5;
  const rampCenterY = scaledHeight * 0.5;

  return (
    <>
      <LabEnvironment variant="floor-only" floorSize={12} />

      <group>
        {/* Wood ramp */}
        <mesh
          rotation={[0, 0, angleRad]}
          position={[rampCenterX, rampCenterY, 0]}
          receiveShadow
        >
          <boxGeometry args={[scaledLength, 0.1, 2]} />
          <meshStandardMaterial color="#8B6914" roughness={0.8} metalness={0.05} />
        </mesh>

        {/* Metal rail left */}
        <mesh
          rotation={[0, 0, angleRad]}
          position={[rampCenterX, rampCenterY, 0.85]}
        >
          <boxGeometry args={[scaledLength, 0.06, 0.06]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Metal rail right */}
        <mesh
          rotation={[0, 0, angleRad]}
          position={[rampCenterX, rampCenterY, -0.85]}
        >
          <boxGeometry args={[scaledLength, 0.06, 0.06]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Support triangle structure under ramp */}
        <mesh position={[rampCenterX * 0.5, -0.05, -0.5]}>
          <boxGeometry args={[baseWidth * 0.5, 0.1, 0.1]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[baseWidth * 0.25, scaledHeight * 0.25 - 0.05, -0.5]} rotation={[0, 0, -angleRad]}>
          <boxGeometry args={[scaledHeight / Math.sin(angleRad) * 0.5, 0.1, 0.1]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Height indicator (vertical line from bottom of ramp to top) */}
        <mesh position={[-0.15, scaledHeight * 0.5, 0]}>
          <boxGeometry args={[0.04, scaledHeight, 0.04]} />
          <meshStandardMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
        {/* Height label */}
        <Html position={[-0.35, scaledHeight * 0.5, 0]} center>
          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
            h={height}m
          </span>
        </Html>
        {/* Height top tick */}
        <mesh position={[0.05, scaledHeight, 0]}>
          <boxGeometry args={[0.2, 0.04, 0.04]} />
          <meshStandardMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
        {/* Height bottom tick */}
        <mesh position={[0.05, 0.02, 0]}>
          <boxGeometry args={[0.2, 0.04, 0.04]} />
          <meshStandardMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>

        {/* Angle arc indicator at bottom-right of ramp */}
        <group position={[baseWidth, 0, 0]}>
          {/* Horizontal reference */}
          <mesh position={[-0.5, 0.02, 0]}>
            <boxGeometry args={[1, 0.03, 0.03]} />
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} />
          </mesh>
          <Html position={[-0.3, 0.2, 0]} center>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              θ={inclineAngle}°
            </span>
          </Html>
        </group>

        {/* Block group — positioned and rotated in useFrame */}
        <group ref={blockGroupRef} position={[nx * blockSize * 0.5, scaledHeight + ny * blockSize * 0.5, 0]} rotation={[0, 0, -angleRad]}>
          <mesh castShadow>
            <boxGeometry args={[blockSize, blockSize, blockSize]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} metalness={0.5} />
          </mesh>

          {/* Force arrows attached to block (move with it) */}
          {/* Weight (mg) — straight down in world space; in block's rotated frame, rotate by +angleRad */}
          <Arrow3D
            start={[0, -blockSize * 0.5, 0]}
            end={[0, -blockSize * 0.5 - weightLen, 0]}
            color="#a78bfa"
            shaftRadius={0.03}
            headRadius={0.08}
            headLength={0.15}
          />
          <Html position={[0.25, -blockSize * 0.5 - weightLen * 0.5, 0]}>
            <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: 11, textShadow: '0 0 4px rgba(0,0,0,0.7)', whiteSpace: 'nowrap' }}>
              mg={weight.toFixed(0)}N
            </span>
          </Html>

          {/* Normal force (N) — perpendicular to surface, pointing away from ramp surface */}
          <Arrow3D
            start={[0, blockSize * 0.5, 0]}
            end={[0, blockSize * 0.5 + normalLen, 0]}
            color="#22d3ee"
            shaftRadius={0.03}
            headRadius={0.08}
            headLength={0.15}
          />
          <Html position={[0.25, blockSize * 0.5 + normalLen * 0.5, 0]}>
            <span style={{ color: '#22d3ee', fontWeight: 600, fontSize: 11, textShadow: '0 0 4px rgba(0,0,0,0.7)', whiteSpace: 'nowrap' }}>
              N={normalForce.toFixed(1)}N
            </span>
          </Html>

          {/* Gravity component along incline (pointing down-slope → +x in block frame) */}
          {gravityCompLen > 0.1 && (
            <Arrow3D
              start={[-blockSize * 0.5, -blockSize * 0.3, 0.3]}
              end={[-blockSize * 0.5 + gravityCompLen, -blockSize * 0.3, 0.3]}
              color="#fbbf24"
              shaftRadius={0.025}
              headRadius={0.07}
              headLength={0.12}
            />
          )}

          {/* Friction force (pointing up-slope → -x in block frame, opposing motion) */}
          {frictionLen > 0.05 && (
            <>
              <Arrow3D
                start={[blockSize * 0.5, blockSize * 0.1, -0.3]}
                end={[blockSize * 0.5 - frictionLen, blockSize * 0.1, -0.3]}
                color="#ef4444"
                shaftRadius={0.025}
                headRadius={0.07}
                headLength={0.12}
              />
              <Html position={[blockSize * 0.5 - frictionLen * 0.5, blockSize * 0.35, -0.3]}>
                <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 10, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
                  f={frictionForce.toFixed(1)}N
                </span>
              </Html>
            </>
          )}

          {/* Mass label */}
          <Html position={[0, blockSize * 0.5 + normalLen + 0.25, 0]} center>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              {mass}kg
            </span>
          </Html>
        </group>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[2, scaledHeight * 0.4, 0]} />
    </>
  );
}

export default function WorkEnergySimulation() {
  const { params } = useLabStore();
  const topicId = 'work-energy';
  const p = params[topicId] || {};

  const mass = p.mass ?? 10;
  const height = p.height ?? 10;
  const friction = p.friction ?? 0.2;
  const inclineAngle = p.inclineAngle ?? 30;
  const angleRad = (inclineAngle * Math.PI) / 180;
  const inclineLength = height / Math.sin(angleRad);
  const pe = (mass * 9.8 * height).toFixed(1);
  const workFriction = (friction * mass * 9.8 * Math.cos(angleRad) * inclineLength).toFixed(1);
  const ke = (mass * 9.8 * height - friction * mass * 9.8 * Math.cos(angleRad) * inclineLength);
  const keVal = ke > 0 ? ke.toFixed(1) : '0';

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Potential Energy', expression: `PE = mgh = ${pe} J` },
        { name: 'Work by Friction', expression: `Wf = μmgcos(θ)L = ${workFriction} J` },
        { name: 'Kinetic Energy', expression: `KE = PE - Wf = ${keVal} J` },
      ]}
      liveValues={[
        { label: 'PE', value: pe, unit: 'J' },
        { label: 'W_f', value: workFriction, unit: 'J' },
        { label: 'KE', value: keVal, unit: 'J' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [7, 4, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <WorkEnergyScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
