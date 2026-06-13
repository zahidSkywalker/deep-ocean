'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationContainer } from '@/components/simulation/SimulationContainer';
import { useLabStore } from '@/store/useLabStore';
import { LabEnvironment } from '@/components/simulation/LabEnvironment';

const NUM_POINTS = 120;

function WaveLine({ color, lineRef, geoRef }: {
  color: string;
  lineRef: React.RefObject<THREE.Line | null>;
  geoRef: React.RefObject<THREE.BufferGeometry | null>;
}) {
  // Attach geometry created externally to the line
  useEffect(() => {
    if (!lineRef.current || !geoRef.current) return;
    const old = lineRef.current.geometry;
    lineRef.current.geometry = geoRef.current;
    old.dispose();
  }, [lineRef, geoRef]);

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}

function CombinedWaveLine({ lineRef, geoRef }: {
  lineRef: React.RefObject<THREE.Line | null>;
  geoRef: React.RefObject<THREE.BufferGeometry | null>;
}) {
  useEffect(() => {
    if (!lineRef.current || !geoRef.current) return;
    const old = lineRef.current.geometry;
    lineRef.current.geometry = geoRef.current;
    old.dispose();
  }, [lineRef, geoRef]);

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial vertexColors linewidth={2} />
    </line>
  );
}

function WavesScene() {
  const { params, isPlaying } = useLabStore();
  const topicId = 'waves';
  const p = params[topicId] || {};

  const freq1 = p.frequency1 ?? 2;
  const freq2 = p.frequency2 ?? 2;
  const amplitude = p.amplitude ?? 1;
  const wavelength = p.wavelength ?? 2;
  const beatFreq = Math.abs(freq1 - freq2);

  const wave1Y = 3;
  const wave2Y = 0;
  const combinedY = -3;
  const zBase = 0;

  const timeRef = useRef(0);

  // Line refs
  const wave1LineRef = useRef<THREE.Line>(null);
  const wave2LineRef = useRef<THREE.Line>(null);
  const combinedLineRef = useRef<THREE.Line>(null);

  // Geometry refs — created in useEffect
  const wave1GeoRef = useRef<THREE.BufferGeometry>(null);
  const wave2GeoRef = useRef<THREE.BufferGeometry>(null);
  const combinedGeoRef = useRef<THREE.BufferGeometry>(null);

  // Create all geometries in useEffect
  useEffect(() => {
    const makeGeo = (hasColor = false) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NUM_POINTS * 3), 3));
      if (hasColor) {
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NUM_POINTS * 3), 3));
      }
      return g;
    };

    wave1GeoRef.current = makeGeo();
    wave2GeoRef.current = makeGeo();
    combinedGeoRef.current = makeGeo(true);

    return () => {
      wave1GeoRef.current?.dispose();
      wave2GeoRef.current?.dispose();
      combinedGeoRef.current?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta;
    }

    const t = timeRef.current;

    // Mutate wave1 geometry
    if (wave1GeoRef.current) {
      const attr = wave1GeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < NUM_POINTS; i++) {
        const x = (i / (NUM_POINTS - 1)) * 10 - 5;
        const y1 = amplitude * Math.sin((x / wavelength) * Math.PI * 2 - t * freq1 * Math.PI * 2);
        arr[i * 3] = x;
        arr[i * 3 + 1] = y1 + wave1Y;
        arr[i * 3 + 2] = zBase;
      }
      attr.needsUpdate = true;
    }

    // Mutate wave2 geometry
    if (wave2GeoRef.current) {
      const attr = wave2GeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < NUM_POINTS; i++) {
        const x = (i / (NUM_POINTS - 1)) * 10 - 5;
        const y2 = amplitude * Math.sin((x / wavelength) * Math.PI * 2 - t * freq2 * Math.PI * 2);
        arr[i * 3] = x;
        arr[i * 3 + 1] = y2 + wave2Y;
        arr[i * 3 + 2] = zBase;
      }
      attr.needsUpdate = true;
    }

    // Mutate combined geometry with interference coloring
    if (combinedGeoRef.current) {
      const posAttr = combinedGeoRef.current.attributes.position as THREE.BufferAttribute;
      const colAttr = combinedGeoRef.current.attributes.color as THREE.BufferAttribute;
      const pArr = posAttr.array as Float32Array;
      const cArr = colAttr.array as Float32Array;

      for (let i = 0; i < NUM_POINTS; i++) {
        const x = (i / (NUM_POINTS - 1)) * 10 - 5;
        const y1 = amplitude * Math.sin((x / wavelength) * Math.PI * 2 - t * freq1 * Math.PI * 2);
        const y2 = amplitude * Math.sin((x / wavelength) * Math.PI * 2 - t * freq2 * Math.PI * 2);
        const yc = y1 + y2;

        pArr[i * 3] = x;
        pArr[i * 3 + 1] = yc + combinedY;
        pArr[i * 3 + 2] = zBase;

        const maxAmp = amplitude * 2;
        const ratio = Math.min(1, Math.abs(yc) / maxAmp);
        cArr[i * 3] = 1.0 - ratio;
        cArr[i * 3 + 1] = ratio;
        cArr[i * 3 + 2] = 0.2;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  // Baseline positions (static)
  const baselinePositions = useMemo(
    () => [
      new Float32Array([-5, wave1Y, zBase, 5, wave1Y, zBase]),
      new Float32Array([-5, wave2Y, zBase, 5, wave2Y, zBase]),
      new Float32Array([-5, combinedY, zBase, 5, combinedY, zBase]),
    ],
    [wave1Y, wave2Y, combinedY, zBase]
  );

  return (
    <>
      <LabEnvironment variant="floor-only" floorSize={14} />

      <group position={[0, 0.5, 0]}>
        {/* Baselines */}
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[baselinePositions[0], 3]} count={2} />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[baselinePositions[1], 3]} count={2} />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[baselinePositions[2], 3]} count={2} />
          </bufferGeometry>
          <lineBasicMaterial color="#475569" transparent opacity={0.3} />
        </line>

        {/* Wave lines */}
        <WaveLine color="#4ade80" lineRef={wave1LineRef} geoRef={wave1GeoRef} />
        <WaveLine color="#f59e0b" lineRef={wave2LineRef} geoRef={wave2GeoRef} />
        <CombinedWaveLine lineRef={combinedLineRef} geoRef={combinedGeoRef} />

        {/* Text Labels */}
        <Html position={[-6, wave1Y, zBase]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>
            Wave 1 (f₁={freq1} Hz)
          </span>
        </Html>
        <Html position={[-6, wave2Y, zBase]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>
            Wave 2 (f₂={freq2} Hz)
          </span>
        </Html>
        <Html position={[-6, combinedY, zBase]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>
            Superposition
          </span>
        </Html>

        {beatFreq > 0.05 && (
          <Html position={[6, combinedY - 1.2, zBase]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#f472b6', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>
              Beat freq: |f₁-f₂| = {beatFreq.toFixed(2)} Hz
            </span>
          </Html>
        )}

        <Html position={[6, wave1Y - 1.2, zBase]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
            <span style={{ color: '#4ade80', fontSize: '10px', fontWeight: 600, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>● Constructive</span>
            <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 600, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>● Destructive</span>
          </div>
        </Html>
      </group>

      <OrbitControls enableDamping dampingFactor={0.05} makeDefault />
    </>
  );
}

export default function WavesSimulation() {
  const { params } = useLabStore();
  const topicId = 'waves';
  const p = params[topicId] || {};
  const freq1 = p.frequency1 ?? 2;
  const freq2 = p.frequency2 ?? 2;
  const wavelength = p.wavelength ?? 2;
  const amplitude = p.amplitude ?? 1;
  const beatFreq = Math.abs(freq1 - freq2).toFixed(2);

  return (
    <SimulationContainer
      topicId={topicId}
      formulas={[
        { name: 'Wave 1', expression: `y₁ = ${amplitude} sin(2π·${freq1}t)` },
        { name: 'Wave 2', expression: `y₂ = ${amplitude} sin(2π·${freq2}t)` },
        { name: 'Superposition', expression: `y = y₁ + y₂` },
        { name: 'Beat Frequency', expression: `f_beat = |${freq1} - ${freq2}| = ${beatFreq} Hz` },
      ]}
      liveValues={[
        { label: 'f₁', value: String(freq1), unit: 'Hz' },
        { label: 'f₂', value: String(freq2), unit: 'Hz' },
        { label: 'Beat', value: beatFreq, unit: 'Hz' },
      ]}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 10], fov: 50 }}>
        <Suspense fallback={null}><WavesScene /></Suspense>
      </Canvas>
    </SimulationContainer>
  );
}
