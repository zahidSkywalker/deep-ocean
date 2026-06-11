'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { useWorldStore } from '@/store/useWorldStore';
import * as THREE from 'three';

/* ─── Dynamic Sky with Day/Night Cycle ─── */
export default function DynamicSky() {
  const skyRef = useRef<any>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);

  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const timeSpeed = useWorldStore((s) => s.timeSpeed);
  const isPaused = useWorldStore((s) => s.isPaused);

  // Calculate sun position from time
  // timeOfDay: 0=midnight, 0.25=6AM, 0.5=noon, 0.75=6PM
  const getSunPosition = (t: number): [number, number, number] => {
    const angle = t * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle) * 100, Math.sin(angle) * 100, 50];
  };

  const getSunIntensity = (t: number) => {
    if (t < 0.2 || t > 0.8) return 0; // Night
    if (t < 0.3) return (t - 0.2) / 0.1; // Sunrise
    if (t > 0.7) return (0.8 - t) / 0.1; // Sunset
    return 1; // Full day
  };

  const getAmbientIntensity = (t: number) => {
    const base = 0.05;
    const sun = getSunIntensity(t);
    return base + sun * 0.3;
  };

  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
  const sunPos = getSunPosition(timeOfDay);

  useFrame((_, delta) => {
    if (isPaused) return;

    // Advance time
    const store = useWorldStore.getState();
    store.setTime(store.timeOfDay + timeSpeed * delta);

    const t = store.timeOfDay;
    const sunPos = getSunPosition(t);
    const sunInt = getSunIntensity(t);
    const ambInt = getAmbientIntensity(t);

    // Update sun light
    if (sunLightRef.current) {
      sunLightRef.current.position.set(...sunPos);
      sunLightRef.current.intensity = sunInt * 2.5;

      // Sun color - warm at horizon, white at noon
      const horizonFactor = Math.min(
        Math.max(0, 1 - Math.abs(t - 0.25) * 10),
        Math.max(0, 1 - Math.abs(t - 0.75) * 10)
      );
      sunLightRef.current.color.setHSL(
        0.1 - horizonFactor * 0.05,
        0.3 + horizonFactor * 0.5,
        0.8 - horizonFactor * 0.2
      );
    }

    // Update ambient
    if (ambientRef.current) {
      ambientRef.current.intensity = ambInt;
    }

    // Update moon
    if (moonLightRef.current) {
      const moonAngle = (t + 0.5) * Math.PI * 2 - Math.PI / 2;
      moonLightRef.current.position.set(
        Math.cos(moonAngle) * 80,
        Math.sin(moonAngle) * 80,
        30
      );
      moonLightRef.current.intensity = isNight ? 0.15 : 0;
    }

    // Hemisphere light
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = 0.1 + sunInt * 0.4;
    }
  });

  return (
    <>
      {/* Sky */}
      <Sky
        ref={skyRef}
        distance={450000}
        sunPosition={sunPos}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={isNight ? 0 : 2}
        turbidity={8}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* Stars (visible at night) */}
      {isNight && (
        <Stars
          radius={200}
          depth={80}
          count={3000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
      )}

      {/* Sun directional light */}
      <directionalLight
        ref={sunLightRef}
        position={sunPos}
        intensity={getSunIntensity(timeOfDay) * 2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.001}
      />

      {/* Moon light */}
      <directionalLight
        ref={moonLightRef}
        intensity={isNight ? 0.15 : 0}
        color="#aabbdd"
      />

      {/* Ambient fill */}
      <ambientLight ref={ambientRef} intensity={getAmbientIntensity(timeOfDay)} color="#8899bb" />

      {/* Hemisphere light for sky/ground color */}
      <hemisphereLight
        ref={hemiLightRef}
        color={isNight ? "#111133" : "#87ceeb"}
        groundColor="#333322"
        intensity={0.1 + getSunIntensity(timeOfDay) * 0.4}
      />
    </>
  );
}
