'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

/* ── Thin-lens ray tracer ─────────────────────────────────────────── */
function traceRay(
  startX: number,
  startY: number,
  startSlope: number,
  lenses: { x: number; f: number }[],
  endX: number,
): [number, number][] {
  const pts: [number, number][] = [[startX, startY]];
  let cx = startX;
  let cy = startY;
  let slope = startSlope;

  for (const lens of lenses) {
    if (lens.x <= cx + 0.001) continue;
    const yAtLens = cy + slope * (lens.x - cx);
    pts.push([lens.x, yAtLens]);
    slope = slope - yAtLens / lens.f;
    cx = lens.x;
    cy = yAtLens;
  }

  pts.push([cx + (endX - cx), cy + slope * (endX - cx)]);
  return pts;
}

function to3D(pts: [number, number][]): [number, number, number][] {
  return pts.map(([x, y]) => [x, y, 0]);
}

/* ── Scene ───────────────────────────────────────────────────────── */
function OpticsScene() {
  const { params } = useLabStore();
  const topicId = 'optics';
  const p = params[topicId] || {};

  const focalLength1 = p.focalLength1 ?? 10;   // cm
  const focalLength2 = p.focalLength2 ?? 5;     // cm
  const objectDistance = p.objectDistance ?? 25;  // cm
  const lensType = p.lensType ?? 0;              // 0 = microscope, 1 = telescope

  const f1 = focalLength1;
  const f2 = focalLength2;
  const u = objectDistance;

  /* ── Derived optics values ─────────────────────────────────────── */
  let v1: number | null = null;
  let totalLength: number;
  let magnificationStr = '—';
  let imageDistanceStr = '—';

  if (lensType === 0) {
    // Microscope
    v1 = (f1 * u) / (u - f1);
    v1 = Math.min(Math.max(v1, f1 + 0.5), 150);
    totalLength = u + v1 + f2 + 12;
    magnificationStr = (-(v1 / u) * (25 / f2)).toFixed(1);
    imageDistanceStr = '\u221E (relaxed)';
  } else {
    // Telescope
    totalLength = f1 + f2 + 20;
    magnificationStr = (f1 / f2).toFixed(1);
    imageDistanceStr = '\u221E';
  }

  // Adaptive scale so system fits ~7 units
  const scale = Math.min(0.15, 7 / totalLength);

  // 3D positions
  const objLensX = 0;
  const objX = -u * scale;
  const objH = 0.45;

  let epLensX: number;
  let intImgX3D: number | null = null;
  let intImgH3D: number | null = null;

  if (lensType === 0 && v1 !== null) {
    epLensX = (v1 + f2) * scale;
    intImgX3D = v1 * scale;
    intImgH3D = -(v1 / u) * objH;
  } else {
    epLensX = (f1 + f2) * scale;
  }

  const endX = epLensX + 2.5;

  /* ── Ray paths (computed once per param change) ─────────────────── */
  const rayPaths = useMemo(() => {
    const f1s = f1 * scale;
    const f2s = f2 * scale;
    const lenses = [
      { x: objLensX, f: f1s },
      { x: epLensX, f: f2s },
    ];
    const rays: [number, number, number][][] = [];

    if (lensType === 0) {
      // Microscope: 3 rays from object tip
      // Ray 1 — parallel to axis
      rays.push(to3D(traceRay(objX, objH, 0, lenses, endX)));

      // Ray 2 — through centre of objective
      const slope2 = (0 - objH) / (objLensX - objX);
      rays.push(to3D(traceRay(objX, objH, slope2, lenses, endX)));

      // Ray 3 — through focal point on object side of objective
      const focalObjX = objLensX - f1s;
      const slope3 = (0 - objH) / (focalObjX - objX);
      rays.push(to3D(traceRay(objX, objH, slope3, lenses, endX)));

      // Optical axis (faint)
      rays.push(to3D(traceRay(objX - 0.5, 0, 0, lenses, endX)));
    } else {
      // Telescope: parallel rays at 3 heights
      const heights = [0.35, 0.12, -0.12];
      for (const h of heights) {
        rays.push(to3D(traceRay(objX, h, 0, lenses, endX)));
      }
      // Axis
      rays.push(to3D(traceRay(objX - 0.5, 0, 0, lenses, endX)));
    }

    return rays;
  }, [f1, f2, scale, objX, objH, objLensX, epLensX, endX, lensType]);

  /* ── Subtle pulse on object arrow ──────────────────────────────── */
  const objectGlowRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (objectGlowRef.current) {
      const mat = objectGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + 0.15 * Math.sin(clock.getElapsedTime() * 3);
    }
  });

  const benchWidth = endX - objX + 1.5;

  return (
    <>
      <LabEnvironment variant="table" />

      <group position={[0, 0, -0.3]}>
        {/* Optical bench — metal rail */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(objX + endX) / 2, -0.35, 0]} receiveShadow>
          <boxGeometry args={[benchWidth, 0.06, 0.22]} />
          <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* ── Object arrow ─────────────────────────────────────────── */}
        <group position={[objX, 0, 0]}>
          <mesh position={[0, objH / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, objH, 8]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
          <mesh position={[0, objH + 0.05, 0]}>
            <coneGeometry args={[0.06, 0.12, 8]} />
            <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.3} />
          </mesh>
          {/* Glow sphere for pulsing animation */}
          <mesh ref={objectGlowRef} position={[0, objH / 2, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.18} />
          </mesh>
          <Html position={[0, objH + 0.25, 0]} center>
            <span className="text-xs font-semibold" style={{ color: '#4ade80', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
              Object
            </span>
          </Html>
        </group>

        {/* ── Objective lens ──────────────────────────────────────── */}
        <group position={[objLensX, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.06, 32]} />
            <meshPhysicalMaterial color="#93c5fd" transparent opacity={0.35} roughness={0.05} metalness={0.2} transmission={0.6} thickness={0.3} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.82, 0.025, 8, 32]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
          </mesh>
          <Html position={[0, -0.2, 0]} center>
            <span className="text-xs font-semibold" style={{ color: '#93c5fd', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
              Objective
            </span>
          </Html>
        </group>

        {/* ── Eyepiece lens ──────────────────────────────────────── */}
        <group position={[epLensX, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
            <meshPhysicalMaterial color="#c4b5fd" transparent opacity={0.35} roughness={0.05} metalness={0.2} transmission={0.6} thickness={0.2} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.52, 0.02, 8, 32]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
          </mesh>
          <Html position={[0, -0.2, 0]} center>
            <span className="text-xs font-semibold" style={{ color: '#c4b5fd', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
              Eyepiece
            </span>
          </Html>
        </group>

        {/* ── Focal-point markers (objective) ─────────────────────── */}
        <mesh position={[objLensX + f1 * scale, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
        <Html position={[objLensX + f1 * scale, -0.12, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#ef4444', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            f&#8321;={focalLength1}cm
          </span>
        </Html>

        <mesh position={[objLensX - f1 * scale, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>

        {/* ── Focal-point marker (eyepiece) ────────────────────────── */}
        <mesh position={[epLensX + f2 * scale, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.5} />
        </mesh>
        <Html position={[epLensX + f2 * scale, -0.12, 0]} center>
          <span className="text-[11px] font-semibold" style={{ color: '#a78bfa', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
            f&#8322;={focalLength2}cm
          </span>
        </Html>

        {/* ── Intermediate image arrow (microscope only) ─────────── */}
        {intImgX3D !== null && intImgH3D !== null && Math.abs(intImgH3D) < 2.5 && (
          <group position={[intImgX3D, 0, 0]}>
            <mesh position={[0, intImgH3D / 2, 0]}>
              <cylinderGeometry args={[0.015, 0.015, Math.abs(intImgH3D), 8]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
            <mesh position={[0, intImgH3D > 0 ? intImgH3D + 0.04 : intImgH3D - 0.04, 0]}
                  rotation={intImgH3D > 0 ? 0 : Math.PI}>
              <coneGeometry args={[0.05, 0.1, 8]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
            </mesh>
            <Html position={[0, intImgH3D > 0 ? intImgH3D + 0.2 : intImgH3D - 0.2, 0]} center>
              <span className="text-[11px] font-semibold" style={{ color: '#f97316', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                Image
              </span>
            </Html>
          </group>
        )}

        {/* ── Magnification label ─────────────────────────────────── */}
        <Html position={[(objLensX + epLensX) / 2, 1.2, 0]} center>
          <span className="text-sm font-bold" style={{ color: '#fde047', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>
            M = {magnificationStr}&times;
          </span>
        </Html>

        {/* ── Rays ─────────────────────────────────────────────────── */}
        {rayPaths.map((points, i) => {
          const isAxis = i === rayPaths.length - 1;
          return (
            <Line
              key={i}
              points={points}
              color={isAxis ? '#94a3b8' : '#fde047'}
              lineWidth={isAxis ? 0.5 : 2}
              transparent
              opacity={isAxis ? 0.2 : 0.75}
            />
          );
        })}
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0.3, -0.3]} />
    </>
  );
}

/* ── Export ────────────────────────────────────────────────────────── */
export default function OpticsSimulation() {
  const { params } = useLabStore();
  const topicId = 'optics';
  const p = params[topicId] || {};

  const focalLength1 = p.focalLength1 ?? 10;
  const focalLength2 = p.focalLength2 ?? 5;
  const objectDistance = p.objectDistance ?? 25;
  const lensType = p.lensType ?? 0;

  const f1 = focalLength1;
  const f2 = focalLength2;
  const u = objectDistance;

  let magnification = '\u2014';
  let imageDistance = '\u2014';
  const modeLabel = lensType === 0 ? 'Microscope' : 'Telescope';

  if (lensType === 0) {
    const v1 = Math.min(Math.max((f1 * u) / (u - f1), f1 + 0.5), 150);
    magnification = (-(v1 / u) * (25 / f2)).toFixed(1);
    imageDistance = '\u221E (relaxed)';
  } else {
    magnification = (f1 / f2).toFixed(1);
    imageDistance = '\u221E';
  }

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Lens Equation', expression: '1/f = 1/v + 1/u' },
        { name: 'Magnification', expression: `M = ${magnification}\u00D7 (${modeLabel})` },
      ]}
      liveValues={[
        { label: 'M', value: magnification, unit: '\u00D7' },
        { label: 'f\u2081', value: `${focalLength1}`, unit: 'cm' },
        { label: 'f\u2082', value: `${focalLength2}`, unit: 'cm' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 1, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <OpticsScene />
        </Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
