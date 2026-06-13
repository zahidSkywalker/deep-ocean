'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

/* ── Numerical field-line tracer ────────────────────────────────── */

interface Charge {
  x: number;
  y: number;
  q: number;
}

function traceFieldLine(
  startX: number,
  startY: number,
  charges: Charge[],
  maxSteps = 300,
  stepSize = 0.018,
  maxDist = 4,
): [number, number, number][] {
  const pts: [number, number, number][] = [[startX, startY, 0]];
  let x = startX;
  let y = startY;

  for (let s = 0; s < maxSteps; s++) {
    let Ex = 0;
    let Ey = 0;
    for (const c of charges) {
      const dx = x - c.x;
      const dy = y - c.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 0.12) continue; // too close — skip
      const r3 = r * r * r;
      Ex += c.q * dx / r3;
      Ey += c.q * dy / r3;
    }

    const mag = Math.sqrt(Ex * Ex + Ey * Ey);
    if (mag < 1e-8) break;

    x += (Ex / mag) * stepSize;
    y += (Ey / mag) * stepSize;
    pts.push([x, y, 0]);

    // Reached a negative charge?
    for (const c of charges) {
      if (c.q < 0) {
        const dx = x - c.x;
        const dy = y - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.18) return pts;
      }
    }

    // Gone too far?
    if (Math.abs(x) > maxDist || Math.abs(y) > maxDist) break;
  }

  return pts;
}

/* ── Scene ───────────────────────────────────────────────────────── */
function ElectrostaticsScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'electrostatics';
  const p = params[topicId] || {};

  const charge1 = p.charge1 ?? 5;
  const charge2 = p.charge2 ?? -3;
  const distance = p.distance ?? 1;

  const k = 8.99e9;
  const force = (k * Math.abs(charge1) * Math.abs(charge2) * 1e-12) / (distance * distance);
  const isAttractive = charge1 * charge2 < 0;

  // Charge positions (symmetric about origin)
  const half = distance / 2;
  const p1x = -half;
  const p2x = half;
  const cy = 0.5;

  /* ── Compute field lines ──────────────────────────────────────── */
  const fieldLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    // Normalised charges for tracing (shapes depend on ratio, not magnitude)
    const abs1 = Math.abs(charge1);
    const abs2 = Math.abs(charge2);
    const maxAbs = Math.max(abs1, abs2, 1);

    const charges: Charge[] = [
      { x: p1x, y: cy, q: charge1 / maxAbs * 3 },
      { x: p2x, y: cy, q: charge2 / maxAbs * 3 },
    ];

    const startR = 0.22;

    if (isAttractive) {
      // Trace from the positive charge outward — lines end at negative
      const posCharge = charge1 > 0 ? charges[0] : charges[1];
      const numLines = Math.max(8, Math.round(abs1 * 2.5));
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const sx = posCharge.x + Math.cos(angle) * startR;
        const sy = posCharge.y + Math.sin(angle) * startR;
        const line = traceFieldLine(sx, sy, charges);
        if (line.length > 6) lines.push(line);
      }
    } else {
      // Like charges: trace outward from each
      const numPerCharge = Math.max(6, Math.round(Math.min(abs1, abs2) * 2));
      for (const c of charges) {
        for (let i = 0; i < numPerCharge; i++) {
          const angle = (i / numPerCharge) * Math.PI * 2;
          const sx = c.x + Math.cos(angle) * startR;
          const sy = c.y + Math.sin(angle) * startR;
          const line = traceFieldLine(sx, sy, charges);
          if (line.length > 6) lines.push(line);
        }
      }
    }

    return lines;
  }, [charge1, charge2, distance, isAttractive, p1x, p2x, cy]);

  /* ── Equipotential circles ────────────────────────────────────── */
  const equipotentialLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    const radii = [0.45, 0.8, 1.2];
    for (const cx of [p1x, p2x]) {
      for (const r of radii) {
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
        }
        lines.push(pts);
      }
    }
    return lines;
  }, [p1x, p2x, cy]);

  /* ── Force arrows ──────────────────────────────────────────────── */
  const arrowLength = Math.min(1.5, Math.max(0.25, Math.abs(charge1) * Math.abs(charge2) / (distance * distance) * 0.04));
  // Direction: unit vector from q1 to q2
  const dirX = p2x - p1x;
  const dirLen = Math.sqrt(dirX * dirX);
  const nx = dirLen > 0 ? dirX / dirLen : 1;
  // Repulsive → arrows point away from each other; attractive → toward
  const arrowDir1 = isAttractive ? 1 : -1;  // on charge 1
  const arrowDir2 = isAttractive ? -1 : 1;  // on charge 2

  /* ── Test charge animation ───────────────────────────────────── */
  const testChargeRef = useRef<THREE.Mesh>(null);
  const testProgressRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying || !testChargeRef.current) return;
    testProgressRef.current += delta * 0.25;

    // Pick first field line for test charge to travel along
    const line = fieldLines[0];
    if (!line || line.length < 2) return;

    const totalLen = line.length - 1;
    const progress = testProgressRef.current % 1;
    const idx = progress * totalLen;
    const i = Math.min(Math.floor(idx), totalLen - 1);
    const frac = idx - i;

    if (i < line.length - 1) {
      const x = line[i][0] + (line[i + 1][0] - line[i][0]) * frac;
      const y = line[i][1] + (line[i + 1][1] - line[i][1]) * frac;
      testChargeRef.current.position.set(x, y, 0.02);
    }
  });

  /* ── Field-line glow pulse ─────────────────────────────────────── */
  const fieldLineGroupRef = useRef<THREE.Group>(null);
  const glowPhaseRef = useRef(0);

  useFrame((_, delta) => {
    if (isPlaying) glowPhaseRef.current += delta * 0.8;
    // We just keep the phase — Line opacity is static but we pulse the test charge glow
  });

  const testGlowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (testGlowRef.current) {
      const mat = testGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + 0.08 * Math.sin(clock.getElapsedTime() * 4);
    }
  });

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0, -0.3]}>

        {/* ── Charge 1 ───────────────────────────────────────────── */}
        <group position={[p1x, cy, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color={charge1 > 0 ? '#ef4444' : '#3b82f6'}
              emissive={charge1 > 0 ? '#ef4444' : '#3b82f6'}
              emissiveIntensity={0.5}
              roughness={0.15}
              metalness={0.85}
            />
          </mesh>
          {/* + or − sign */}
          <mesh position={[0, 0, 0.31]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {charge1 > 0 && (
            <mesh position={[0, 0, 0.32]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.18, 0.04, 0.02]} />
              <meshStandardMaterial color="white" />
            </mesh>
          )}
        </group>

        {/* ── Charge 2 ───────────────────────────────────────────── */}
        <group position={[p2x, cy, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial
              color={charge2 > 0 ? '#ef4444' : '#3b82f6'}
              emissive={charge2 > 0 ? '#ef4444' : '#3b82f6'}
              emissiveIntensity={0.5}
              roughness={0.15}
              metalness={0.85}
            />
          </mesh>
          <mesh position={[0, 0, 0.31]}>
            <boxGeometry args={[0.18, 0.04, 0.02]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {charge2 > 0 && (
            <mesh position={[0, 0, 0.32]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.18, 0.04, 0.02]} />
              <meshStandardMaterial color="white" />
            </mesh>
          )}
        </group>

        {/* ── Electric field lines ───────────────────────────────── */}
        <group ref={fieldLineGroupRef}>
          {fieldLines.map((pts, i) => (
            <Line
              key={`fl${i}`}
              points={pts}
              color={isAttractive ? '#fbbf24' : '#a78bfa'}
              lineWidth={1.2}
              transparent
              opacity={0.55}
            />
          ))}
        </group>

        {/* ── Equipotential circles ─────────────────────────────── */}
        {equipotentialLines.map((pts, i) => (
          <Line
            key={`eq${i}`}
            points={pts}
            color="#64748b"
            lineWidth={0.6}
            transparent
            opacity={0.2}
          />
        ))}

        {/* ── Force arrows ───────────────────────────────────────── */}
        {charge1 * charge2 !== 0 && (
          <>
            {/* Arrow on charge 1 */}
            <group position={[p1x + arrowDir1 * nx * 0.45, cy, 0]}>
              <mesh rotation={[0, 0, arrowDir1 > 0 ? 0 : Math.PI]}>
                <cylinderGeometry args={[0.015, 0.015, arrowLength, 6]} />
                <meshStandardMaterial
                  color={isAttractive ? '#4ade80' : '#ef4444'}
                  emissive={isAttractive ? '#4ade80' : '#ef4444'}
                  emissiveIntensity={0.4}
                />
              </mesh>
              <mesh position={[0, arrowDir1 > 0 ? arrowLength / 2 + 0.06 : -arrowLength / 2 - 0.06, 0]}
                    rotation={[0, 0, arrowDir1 > 0 ? 0 : Math.PI]}>
                <coneGeometry args={[0.07, 0.16, 8]} />
                <meshStandardMaterial
                  color={isAttractive ? '#4ade80' : '#ef4444'}
                  emissive={isAttractive ? '#4ade80' : '#ef4444'}
                  emissiveIntensity={0.4}
                />
              </mesh>
            </group>

            {/* Arrow on charge 2 */}
            <group position={[p2x + arrowDir2 * nx * 0.45, cy, 0]}>
              <mesh rotation={[0, 0, arrowDir2 > 0 ? 0 : Math.PI]}>
                <cylinderGeometry args={[0.015, 0.015, arrowLength, 6]} />
                <meshStandardMaterial
                  color={isAttractive ? '#4ade80' : '#ef4444'}
                  emissive={isAttractive ? '#4ade80' : '#ef4444'}
                  emissiveIntensity={0.4}
                />
              </mesh>
              <mesh position={[0, arrowDir2 > 0 ? arrowLength / 2 + 0.06 : -arrowLength / 2 - 0.06, 0]}
                    rotation={[0, 0, arrowDir2 > 0 ? 0 : Math.PI]}>
                <coneGeometry args={[0.07, 0.16, 8]} />
                <meshStandardMaterial
                  color={isAttractive ? '#4ade80' : '#ef4444'}
                  emissive={isAttractive ? '#4ade80' : '#ef4444'}
                  emissiveIntensity={0.4}
                />
              </mesh>
            </group>
          </>
        )}

        {/* ── Test charge (animated) ──────────────────────────────── */}
        <mesh ref={testChargeRef} position={[p1x + 0.3, cy, 0.02]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.7} />
        </mesh>
        <mesh ref={testGlowRef} position={[p1x + 0.3, cy, 0.02]}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>

        {/* ── Labels ─────────────────────────────────────────────── */}
        <Html position={[p1x, cy - 0.55, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: charge1 > 0 ? '#fca5a5' : '#93c5fd', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            q&#8321;={charge1}\u03BCC
          </span>
        </Html>
        <Html position={[p2x, cy - 0.55, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: charge2 > 0 ? '#fca5a5' : '#93c5fd', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            q&#8322;={charge2}\u03BCC
          </span>
        </Html>

        {/* Distance label */}
        <Html position={[(p1x + p2x) / 2, cy + 0.65, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#e2e8f0', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            r={distance}m
          </span>
        </Html>

        {/* Force label */}
        <Html position={[(p1x + p2x) / 2, cy - 0.85, 0]} center>
          <span className="text-xs font-bold" style={{ color: isAttractive ? '#4ade80' : '#ef4444', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            F={force.toFixed(2)}N &middot; {isAttractive ? 'Attractive' : 'Repulsive'}
          </span>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, cy, -0.3]} />
    </>
  );
}

/* ── Export ────────────────────────────────────────────────────────── */
export default function ElectrostaticsSimulation() {
  const { params } = useLabStore();
  const topicId = 'electrostatics';
  const p = params[topicId] || {};

  const charge1 = p.charge1 ?? 5;
  const charge2 = p.charge2 ?? -3;
  const distance = p.distance ?? 1;

  const k = 8.99e9;
  const force = (k * Math.abs(charge1) * Math.abs(charge2) * 1e-12) / (distance * distance);
  const isAttractive = charge1 * charge2 < 0;

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: "Coulomb's Law", expression: `F = kq\u2081q\u2082/r\u00B2` },
        { name: 'Direction', expression: isAttractive ? 'Attractive' : 'Repulsive' },
      ]}
      liveValues={[
        { label: 'F', value: force.toFixed(2), unit: 'N' },
        { label: 'q\u2081', value: `${charge1}\u03BCC`, unit: '' },
        { label: 'q\u2082', value: `${charge2}\u03BCC`, unit: '' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 2, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <ElectrostaticsScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
