'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import dynamic from 'next/dynamic';
import { HUD, HUDKeyboardHandler } from '@/components/world/HUD';

// Dynamic import to avoid SSR issues with Three.js
const City = dynamic(() => import('@/components/world/City'), { ssr: false });
const PlayerController = dynamic(() => import('@/components/world/PlayerController'), { ssr: false });
const DynamicSky = dynamic(() => import('@/components/world/Sky'), { ssr: false });
const Weather = dynamic(() => import('@/components/world/Weather'), { ssr: false });
const Effects = dynamic(() => import('@/components/world/Effects'), { ssr: false });

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0f]">
      <div className="mb-6 h-16 w-16 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
      <h1 className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-2xl font-bold text-transparent">
        Open City World
      </h1>
      <p className="mt-2 text-sm text-white/30">Generating city...</p>
    </div>
  );
}

export default function WorldPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.1, far: 500, position: [0, 1.7, 20] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onCreated={({ gl }) => {
          gl.toneMapping = 3; // ACESFilmic
          gl.toneMappingExposure = 1.0;
          gl.shadowMap.type = 2; // PCFSoftShadowMap
        }}
      >
        <color attach="background" args={['#0a0a0f']} />

        <Suspense fallback={null}>
          {/* Sky & Lighting */}
          <DynamicSky />

          {/* Weather */}
          <Weather />

          {/* City */}
          <City />

          {/* Player */}
          <PlayerController />

          {/* Post Processing */}
          <Effects />

          {/* Performance */}
          <Preload all />
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <HUD />
      <HUDKeyboardHandler />
    </div>
  );
}
