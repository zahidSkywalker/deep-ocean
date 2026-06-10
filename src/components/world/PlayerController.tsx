'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls as DreiPointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── First Person Controller ─── */
export default function PlayerController() {
  const controlsRef = useRef<any>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  const walkSpeed = useWorldStore((s) => s.walkSpeed);
  const sprintSpeed = useWorldStore((s) => s.sprintSpeed);
  const isPaused = useWorldStore((s) => s.isPaused);
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);
  const setIsPointerLocked = useWorldStore((s) => s.setIsPointerLocked);
  const setShowControls = useWorldStore((s) => s.setShowControls);

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.current.forward = true; break;
      case 'KeyS': case 'ArrowDown': keys.current.backward = true; break;
      case 'KeyA': case 'ArrowLeft': keys.current.left = true; break;
      case 'KeyD': case 'ArrowRight': keys.current.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': keys.current.sprint = true; break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.current.forward = false; break;
      case 'KeyS': case 'ArrowDown': keys.current.backward = false; break;
      case 'KeyA': case 'ArrowLeft': keys.current.left = false; break;
      case 'KeyD': case 'ArrowRight': keys.current.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.current.sprint = false; break;
    }
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);
    canvas.setAttribute('tabindex', '0');
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('keyup', handleKeyUp);
    };
  }, [gl, handleKeyDown, handleKeyUp]);

  useFrame((_, delta) => {
    if (!controlsRef.current?.isLocked || isPaused) return;

    const speed = keys.current.sprint ? sprintSpeed : walkSpeed;

    // Get camera direction (flat, no vertical)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const sideDirection = new THREE.Vector3();
    sideDirection.crossVectors(camera.up, cameraDirection).normalize().negate();

    // Calculate movement direction
    direction.current.set(0, 0, 0);
    if (keys.current.forward) direction.current.add(cameraDirection);
    if (keys.current.backward) direction.current.sub(cameraDirection);
    if (keys.current.left) direction.current.add(sideDirection);
    if (keys.current.right) direction.current.sub(sideDirection);

    if (direction.current.length() > 0) {
      direction.current.normalize();
      velocity.current.x = direction.current.x * speed;
      velocity.current.z = direction.current.z * speed;
    } else {
      // Friction/deceleration
      velocity.current.x *= 0.85;
      velocity.current.z *= 0.85;
    }

    // Apply movement with collision check (simple bounds)
    const cam = camera.position;
    const newX = cam.x + velocity.current.x * delta;
    const newZ = cam.z + velocity.current.z * delta;

    // Clamp to city bounds
    const bounds = 200;
    camera.position.set(
      Math.max(-bounds, Math.min(bounds, newX)),
      1.7,
      Math.max(-bounds, Math.min(bounds, newZ))
    );

    // Update store
    setPlayerPosition([camera.position.x, camera.position.y, camera.position.z]);
  });

  return (
    <DreiPointerLockControls
      ref={controlsRef}
      onLock={() => {
        setIsPointerLocked(true);
        setShowControls(false);
      }}
      onUnlock={() => {
        setIsPointerLocked(false);
        setShowControls(true);
      }}
    />
  );
}
