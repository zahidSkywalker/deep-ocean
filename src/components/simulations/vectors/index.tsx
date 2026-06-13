'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

/* Arrowhead cone at the tip of a vector */
function ArrowHead({
  positionRef,
  directionRef,
  color,
  scale = 0.2,
}: {
  positionRef: React.RefObject<[number, number, number] | null>;
  directionRef: React.RefObject<[number, number, number] | null>;
  color: string;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !positionRef.current || !directionRef.current) return;
    meshRef.current.position.set(...positionRef.current);
    const dir = new THREE.Vector3(...directionRef.current).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    meshRef.current.quaternion.copy(quat);
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[scale * 0.6, scale * 1.5, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} metalness={0.5} />
    </mesh>
  );
}

/* Angle arc between two vectors */
function AngleArc({
  v1Dir,
  v2Dir,
  radius = 0.8,
}: {
  v1Dir: [number, number, number];
  v2Dir: [number, number, number];
  radius?: number;
}) {
  const angle1 = Math.atan2(v1Dir[1], v1Dir[0]);
  const angle2 = Math.atan2(v2Dir[1], v2Dir[0]);

  let diff = angle2 - angle1;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;

  const startAngle = diff < 0 ? angle2 : angle1;
  const sweepDiff = Math.abs(diff);
  const midAngle = startAngle + sweepDiff / 2;

  const arcPoints: [number, number, number][] = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const a = startAngle + t * sweepDiff;
      pts.push([Math.cos(a) * radius, Math.sin(a) * radius, 0]);
    }
    return pts;
  }, [startAngle, sweepDiff, radius]);

  const angleDeg = sweepDiff * (180 / Math.PI);

  return (
    <group>
      <Line points={arcPoints} color="#f97316" lineWidth={2} transparent opacity={0.7} />
      <Html
        position={[Math.cos(midAngle) * (radius + 0.4), Math.sin(midAngle) * (radius + 0.4), 0]}
        center distanceFactor={8} style={{ pointerEvents: 'none' }}
      >
        <span style={{ color: '#f97316', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.6)' }}>
          {angleDeg.toFixed(1)}°
        </span>
      </Html>
    </group>
  );
}

function VectorsScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'vectors';
  const p = params[topicId] || {};

  const v1x = p.vector1X ?? 5;
  const v1y = p.vector1Y ?? 3;
  const v2x = p.vector2X ?? -2;
  const v2y = p.vector2Y ?? 4;
  const rx = v1x + v2x;
  const ry = v1y + v2y;
  const magnitude = Math.sqrt(rx * rx + ry * ry);

  const scale = 0.5;
  const a1x = v1x * scale;
  const a1y = v1y * scale;
  const a2x = v2x * scale;
  const a2y = v2y * scale;
  const arx = rx * scale;
  const ary = ry * scale;

  // Animation progress — ref only
  const animProgress = useRef(0);

  // Line refs for attaching geometry in useEffect
  const line1Ref = useRef<THREE.Line>(null);
  const line2Ref = useRef<THREE.Line>(null);
  const lineRRef = useRef<THREE.Line>(null);

  // Geometry refs — created in useEffect, mutated in useFrame
  const geo1Ref = useRef<THREE.BufferGeometry>(null);
  const geo2Ref = useRef<THREE.BufferGeometry>(null);
  const geoRRef = useRef<THREE.BufferGeometry>(null);

  // Arrow position/direction refs
  const arrow1Pos = useRef<[number, number, number]>([0, 0, 0]);
  const arrow1Dir = useRef<[number, number, number]>([0, 1, 0]);
  const arrow2Pos = useRef<[number, number, number]>([0, 0, 0]);
  const arrow2Dir = useRef<[number, number, number]>([0, 1, 0]);
  const arrowRPos = useRef<[number, number, number]>([0, 0, 0]);
  const arrowRDir = useRef<[number, number, number]>([0, 1, 0]);

  // Visibility group refs
  const vec1Group = useRef<THREE.Group>(null);
  const vec2Group = useRef<THREE.Group>(null);
  const resGroup = useRef<THREE.Group>(null);
  const paraGroup = useRef<THREE.Group>(null);
  const magnitudeGroup = useRef<THREE.Group>(null);
  const arcGroup = useRef<THREE.Group>(null);

  // Create geometries once and attach to lines (not during render)
  useEffect(() => {
    const makeGeo = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      return g;
    };

    geo1Ref.current = makeGeo();
    geo2Ref.current = makeGeo();
    geoRRef.current = makeGeo();

    if (line1Ref.current) line1Ref.current.geometry = geo1Ref.current;
    if (line2Ref.current) line2Ref.current.geometry = geo2Ref.current;
    if (lineRRef.current) lineRRef.current.geometry = geoRRef.current;

    return () => {
      geo1Ref.current?.dispose();
      geo2Ref.current?.dispose();
      geoRRef.current?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    animProgress.current = Math.min(1, animProgress.current + delta * 0.25);
    const progress = animProgress.current;

    // Vector 1
    const t1 = Math.min(1, progress / 0.33);
    if (geo1Ref.current) {
      const attr = geo1Ref.current.attributes.position as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      a[0] = 0; a[1] = 0; a[2] = 0;
      a[3] = a1x * t1; a[4] = a1y * t1; a[5] = 0;
      attr.needsUpdate = true;
    }
    arrow1Pos.current = [a1x * t1, a1y * t1, 0];
    if (t1 > 0.01) arrow1Dir.current = [a1x, a1y, 0];

    // Vector 2
    const t2 = Math.min(1, Math.max(0, (progress - 0.33) / 0.33));
    if (geo2Ref.current) {
      const attr = geo2Ref.current.attributes.position as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      a[0] = 0; a[1] = 0; a[2] = 0;
      a[3] = a2x * t2; a[4] = a2y * t2; a[5] = 0;
      attr.needsUpdate = true;
    }
    arrow2Pos.current = [a2x * t2, a2y * t2, 0];
    if (t2 > 0.01) arrow2Dir.current = [a2x, a2y, 0];

    // Resultant
    const tR = Math.min(1, Math.max(0, (progress - 0.66) / 0.34));
    if (geoRRef.current) {
      const attr = geoRRef.current.attributes.position as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      a[0] = 0; a[1] = 0; a[2] = 0;
      a[3] = arx * tR; a[4] = ary * tR; a[5] = 0;
      attr.needsUpdate = true;
    }
    arrowRPos.current = [arx * tR, ary * tR, 0];
    if (tR > 0.01) arrowRDir.current = [arx, ary, 0];

    // Visibility
    if (vec1Group.current) vec1Group.current.visible = progress >= 0.33;
    if (vec2Group.current) vec2Group.current.visible = progress >= 0.66;
    if (resGroup.current) resGroup.current.visible = progress >= 0.66;
    if (paraGroup.current) paraGroup.current.visible = progress >= 0.66;
    if (magnitudeGroup.current) magnitudeGroup.current.visible = progress >= 0.95;
    if (arcGroup.current) arcGroup.current.visible = progress >= 0.66;
  });

  const paraSides: [number, number, number][][] = useMemo(() => [
    [[0, 0, 0], [a1x, a1y, 0]],
    [[0, 0, 0], [a2x, a2y, 0]],
    [[a1x, a1y, 0], [arx, ary, 0]],
    [[a2x, a2y, 0], [arx, ary, 0]],
  ], [a1x, a1y, a2x, a2y, arx, ary]);

  return (
    <>
      <LabEnvironment variant="table" />
      <group position={[0, -0.35, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <planeGeometry args={[8, 5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.3} />
        </mesh>
        <gridHelper args={[8, 16, '#4ade8055', '#4ade8033']} position={[0, 0.01, 0]} />
      </group>

      <group position={[0, 0.05, -0.5]}>
        <line ref={line1Ref as React.RefObject<THREE.Line>}>
          <bufferGeometry />
          <lineBasicMaterial color="#4ade80" linewidth={2} />
        </line>
        <group ref={vec1Group} visible={false}>
          <ArrowHead positionRef={arrow1Pos} directionRef={arrow1Dir} color="#4ade80" />
          <Html position={[a1x + 0.15, a1y + 0.15, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>A=({v1x}, {v1y})</span>
          </Html>
        </group>

        <line ref={line2Ref as React.RefObject<THREE.Line>}>
          <bufferGeometry />
          <lineBasicMaterial color="#f59e0b" linewidth={2} />
        </line>
        <group ref={vec2Group} visible={false}>
          <ArrowHead positionRef={arrow2Pos} directionRef={arrow2Dir} color="#f59e0b" />
          <Html position={[a2x + 0.15, a2y + 0.15, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>B=({v2x}, {v2y})</span>
          </Html>
        </group>

        <line ref={lineRRef as React.RefObject<THREE.Line>}>
          <bufferGeometry />
          <lineBasicMaterial color="#fbbf24" linewidth={2} />
        </line>
        <group ref={resGroup} visible={false}>
          <ArrowHead positionRef={arrowRPos} directionRef={arrowRDir} color="#fbbf24" scale={0.25} />
          <Html position={[arx + 0.15, ary + 0.15, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>R=A+B=({rx}, {ry})</span>
          </Html>
        </group>

        <group ref={paraGroup} visible={false}>
          {paraSides.map((side, i) => (
            <Line key={i} points={side} color="#64748b" lineWidth={1} transparent opacity={0.3} />
          ))}
        </group>

        <group ref={arcGroup} visible={false}>
          <AngleArc v1Dir={[a1x, a1y, 0]} v2Dir={[a2x, a2y, 0]} radius={0.7} />
        </group>

        <group ref={magnitudeGroup} visible={false}>
          <Html position={[arx / 2 - 0.4, ary / 2 + 0.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>|R|={magnitude.toFixed(2)}</span>
          </Html>
        </group>

        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault target={[0, 0, -0.5]} />
    </>
  );
}

export default function VectorsSimulation() {
  const { params } = useLabStore();
  const topicId = 'vectors';
  const p = params[topicId] || {};
  const v1x = p.vector1X ?? 5;
  const v1y = p.vector1Y ?? 3;
  const v2x = p.vector2X ?? -2;
  const v2y = p.vector2Y ?? 4;
  const rx = v1x + v2x;
  const ry = v1y + v2y;
  const magnitude = Math.sqrt(rx * rx + ry * ry).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Addition', expression: `R = (${v1x}+${v2x}, ${v1y}+${v2y}) = (${rx}, ${ry})` },
        { name: 'Magnitude', expression: `|R| = √(${rx}²+${ry}²) = ${magnitude}` },
      ]}
      liveValues={[
        { label: 'A', value: `(${v1x}, ${v1y})`, unit: '' },
        { label: 'B', value: `(${v2x}, ${v2y})`, unit: '' },
        { label: '|R|', value: magnitude, unit: '' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 6], fov: 50 }}>
        <Suspense fallback={null}><VectorsScene /></Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
