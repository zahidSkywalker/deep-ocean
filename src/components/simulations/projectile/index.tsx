'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { OutdoorEnvironment } from '@/components/simulation/OutdoorEnvironment';

const TRAIL_MAX_POINTS = 200;

function ProjectileScene() {
  const ballRef = useRef<THREE.Mesh>(null);
  const ballGlowRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const trailCountRef = useRef(0);
  const { params, isPlaying } = useLabStore();
  const topicId = 'projectile';
  const p = params[topicId] || {};

  const velocity = p.velocity ?? 40;
  const angle = p.angle ?? 45;
  const gravity = p.gravity ?? 9.8;

  const angleRad = (angle * Math.PI) / 180;
  const vx = velocity * Math.cos(angleRad);
  const vy = velocity * Math.sin(angleRad);
  const totalTime = (2 * vy) / gravity;
  const range = vx * totalTime;
  const maxHeight = (vy * vy) / (2 * gravity);

  // Ref-based animation state (no setState in useFrame!)
  const timeRef = useRef(0);
  const isResettingRef = useRef(false);
  const resetTimerRef = useRef(0);

  // Scale factors so trajectory fits nicely in view
  const scaleFactor = 10 / Math.max(range, 1);
  const heightFactor = 5 / Math.max(maxHeight, 1);

  // Cannon barrel length
  const barrelLength = 1.2;
  // Cannon tip world position (cylinder along Y rotated by -angleRad around Z)
  const cannonTipX = Math.sin(angleRad) * (barrelLength * 0.5 + 0.1);
  const cannonTipY = Math.cos(angleRad) * (barrelLength * 0.5 + 0.1);

  // Pre-compute full trajectory as a static curve
  const trajectoryPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalTime;
      const x = cannonTipX + vx * t * scaleFactor;
      const rawY = (vy * t - 0.5 * gravity * t * t) * heightFactor;
      const y = cannonTipY + rawY;
      pts.push([x, Math.max(y, 0.1), 0]);
    }
    return pts;
  }, [vx, vy, gravity, totalTime, scaleFactor, heightFactor, cannonTipX, cannonTipY]);

  // Create trail buffer geometry with useMemo (never in component body!)
  const trailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const colors = new Float32Array(TRAIL_MAX_POINTS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  // Track param changes for smooth reset
  const prevParamsRef = useRef({ velocity, angle, gravity });
  const shouldReset = useRef(false);
  useEffect(() => {
    if (
      prevParamsRef.current.velocity !== velocity ||
      prevParamsRef.current.angle !== angle ||
      prevParamsRef.current.gravity !== gravity
    ) {
      prevParamsRef.current = { velocity, angle, gravity };
      shouldReset.current = true;
    }
  }, [velocity, angle, gravity]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (shouldReset.current) {
      shouldReset.current = false;
      isResettingRef.current = true;
      resetTimerRef.current = 0;
    }

    if (isResettingRef.current) {
      resetTimerRef.current += dt * 2;
      const t = Math.min(resetTimerRef.current, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      // During reset: lerp time back to 0, fade ball
      timeRef.current = timeRef.current * (1 - ease);

      if (t >= 1) {
        isResettingRef.current = false;
        timeRef.current = 0;
        trailCountRef.current = 0;
        if (trailRef.current) {
          (trailRef.current.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
        }
      }
    } else if (isPlaying) {
      timeRef.current += dt * 0.5;
      if (timeRef.current > totalTime) {
        // Start smooth reset at end of flight
        isResettingRef.current = true;
        resetTimerRef.current = 0;
      }
    }

    const time = timeRef.current;

    // Compute ball position along trajectory
    const bx = cannonTipX + vx * time * scaleFactor;
    const rawBy = (vy * time - 0.5 * gravity * time * time) * heightFactor;
    const by = cannonTipY + rawBy;

    if (ballRef.current) {
      ballRef.current.position.set(bx, Math.max(by, 0.15), 0);
    }
    if (ballGlowRef.current) {
      ballGlowRef.current.position.set(bx, Math.max(by, 0.15), 0);
      // Fade out during reset or at landing
      const fade = isResettingRef.current ? Math.max(0, 1 - resetTimerRef.current * 2) : 1;
      const mat = ballGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 * fade;
    }

    // Update trail using buffer attribute (no setState!)
    if (isPlaying && !isResettingRef.current && by >= 0 && trailRef.current) {
      const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = trailRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

      if (trailCountRef.current < TRAIL_MAX_POINTS) {
        const idx = trailCountRef.current;
        posAttr.array[idx * 3] = bx;
        posAttr.array[idx * 3 + 1] = Math.max(by, 0.15);
        posAttr.array[idx * 3 + 2] = 0;

        // Green trail with slight fade
        const progress = idx / TRAIL_MAX_POINTS;
        colorAttr.array[idx * 3] = 0.29 * (1 - progress);
        colorAttr.array[idx * 3 + 1] = 0.87 * (1 - progress * 0.5);
        colorAttr.array[idx * 3 + 2] = 0.5 * (1 - progress);

        trailCountRef.current++;
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        (trailRef.current.geometry as THREE.BufferGeometry).setDrawRange(0, trailCountRef.current);
      }
    }
  });

  // Range markers on ground
  const rangeMarkers = useMemo(() => {
    const markers: { x: number; label: string }[] = [];
    const rangeScaled = range * scaleFactor;
    const step = Math.max(1, Math.round(range / 4));
    for (let d = step; d < range; d += step) {
      markers.push({ x: cannonTipX + d * scaleFactor, label: `${d}m` });
    }
    return markers;
  }, [range, scaleFactor, cannonTipX]);

  return (
    <>
      <OutdoorEnvironment showTrees showGrid={false} />

      <group>
        {/* Pre-computed trajectory curve (faint) */}
        <Line points={trajectoryPoints} color="#fbbf24" lineWidth={1.5} opacity={0.35} transparent />

        {/* Trail (buffer-based points) */}
        <points ref={trailRef} geometry={trailGeometry}>
          <pointsMaterial size={0.06} sizeAttenuation vertexColors transparent opacity={0.8} />
        </points>

        {/* Cannon — cylinder barrel rotated to point in launch direction */}
        <group position={[0, 0.2, 0]} rotation={[0, 0, -angleRad]}>
          {/* Barrel (cylinder along Y) */}
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.2, barrelLength, 12]} />
            <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Barrel tip ring */}
          <mesh position={[0, barrelLength * 0.5 + 0.05, 0]}>
            <cylinderGeometry args={[0.18, 0.15, 0.1, 12]} />
            <meshStandardMaterial color="#334155" roughness={0.25} metalness={0.85} />
          </mesh>
        </group>

        {/* Cannon base support */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Cannon support wheels */}
        {([0.35, -0.35] as const).map((z, i) => (
          <mesh key={i} position={[-0.2, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
            <meshStandardMaterial color="#5c4033" roughness={0.8} />
          </mesh>
        ))}

        {/* Ball */}
        <mesh ref={ballRef} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.4} roughness={0.2} metalness={0.7} />
        </mesh>
        {/* Ball glow */}
        <mesh ref={ballGlowRef}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>

        {/* Launch angle indicator arc */}
        <group position={[0, 0.35, 0]}>
          <mesh rotation={[0, 0, -angleRad]}>
            <boxGeometry args={[0.8, 0.03, 0.03]} />
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
          </mesh>
          <Html position={[0.4, 0.15, 0]} center>
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: 13, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
              θ={angle}°
            </span>
          </Html>
        </group>

        {/* Velocity label at cannon */}
        <Html position={[cannonTipX + 0.3, cannonTipY + 0.4, 0]} center>
          <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px rgba(0,0,0,0.7)' }}>
            v₀={velocity}m/s
          </span>
        </Html>

        {/* Range markers on ground */}
        {rangeMarkers.map((marker, i) => (
          <group key={i}>
            {/* Vertical pole */}
            <mesh position={[marker.x, 0.3, 0.5]}>
              <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
            </mesh>
            <Html position={[marker.x, 0.7, 0.5]} center>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 11, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                {marker.label}
              </span>
            </Html>
          </group>
        ))}

        {/* Landing point marker */}
        <mesh position={[cannonTipX + range * scaleFactor, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.2, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[4, 2, 0]} />
    </>
  );
}

export default function ProjectileSimulation() {
  const { params } = useLabStore();
  const topicId = 'projectile';
  const p = params[topicId] || {};

  const velocity = p.velocity ?? 40;
  const angle = p.angle ?? 45;
  const gravity = p.gravity ?? 9.8;
  const angleRad = (angle * Math.PI) / 180;
  const vx = velocity * Math.cos(angleRad);
  const vy = velocity * Math.sin(angleRad);
  const range = (vx * 2 * vy / gravity).toFixed(1);
  const maxH = ((vy * vy) / (2 * gravity)).toFixed(1);
  const totalT = (2 * vy / gravity).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Range', expression: `R = v²sin(2θ)/g = ${range}m` },
        { name: 'Max Height', expression: `H = v²sin²(θ)/2g = ${maxH}m` },
      ]}
      liveValues={[
        { label: 'R', value: range, unit: 'm' },
        { label: 'H', value: maxH, unit: 'm' },
        { label: 'T', value: totalT, unit: 's' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [5, 4, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <ProjectileScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
