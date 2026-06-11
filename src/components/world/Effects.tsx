'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── Post-Processing Effects ─── */
export default function Effects() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;

  // Bloom is stronger at night (lights glow)
  const bloomIntensity = isNight ? 0.6 : 0.1;
  const bloomThreshold = isNight ? 0.4 : 0.9;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette
        offset={0.3}
        darkness={isNight ? 0.7 : 0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0005, 0.0005)}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
