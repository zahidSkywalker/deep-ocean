'use client'

/**
 * Enhanced 3D lighting environment shared across all simulations.
 * Provides cinematic multi-light setup with shadows, fog, and atmosphere.
 */
export function EnhancedLighting({ variant = 'default' }: { variant?: 'default' | 'space' | 'lab' | 'circuit' }) {
  if (variant === 'space') {
    return (
      <>
        <ambientLight intensity={0.08} />
        <directionalLight
          position={[15, 20, 10]}
          intensity={0.6}
          color="#aaccff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ff8844" />
        <pointLight position={[10, -5, 10]} intensity={0.2} color="#4488ff" />
        <fog attach="fog" args={['#020208', 15, 60]} />
      </>
    )
  }

  if (variant === 'lab') {
    return (
      <>
        <ambientLight intensity={0.2} color="#e8e8ff" />
        <directionalLight
          position={[8, 15, 10]}
          intensity={1.0}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight position={[-5, 8, -8]} intensity={0.25} color="#ffeedd" />
        <pointLight position={[0, 8, -8]} intensity={0.4} color="#88aaff" />
        <fog attach="fog" args={['#050510', 25, 55]} />
      </>
    )
  }

  if (variant === 'circuit') {
    return (
      <>
        <ambientLight intensity={0.15} color="#eeffee" />
        <directionalLight
          position={[10, 12, 10]}
          intensity={0.9}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <pointLight position={[-6, 4, -4]} intensity={0.4} color="#00ff88" />
        <pointLight position={[6, 4, -4]} intensity={0.3} color="#00d4ff" />
        <fog attach="fog" args={['#050510', 20, 50]} />
      </>
    )
  }

  // default
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-8, 8, -5]} intensity={0.3} color="#aabbff" />
      <pointLight position={[0, 10, -10]} intensity={0.5} color="#4488ff" />
      <fog attach="fog" args={['#050510', 20, 50]} />
    </>
  )
}

/**
 * Enhanced ground plane with subtle reflective grid.
 */
export function EnhancedGround({
  width = 20,
  depth = 10,
  color = '#0e0e1a',
  gridColor1 = '#1a1a2e',
  gridColor2 = '#111122',
  y = 0,
}: {
  width?: number
  depth?: number
  color?: string
  gridColor1?: string
  gridColor2?: string
  y?: number
}) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.15} />
      </mesh>
      <gridHelper args={[width, width, gridColor1, gridColor2]} position={[0, y + 0.01, 0]} />
    </>
  )
}
