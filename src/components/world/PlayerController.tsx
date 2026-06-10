'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/useWorldStore';

/* ─── First Person Controller (Desktop + Mobile) ─── */
export default function PlayerController() {
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  const walkSpeed = useWorldStore((s) => s.walkSpeed);
  const sprintSpeed = useWorldStore((s) => s.sprintSpeed);
  const isPaused = useWorldStore((s) => s.isPaused);
  const isPlaying = useWorldStore((s) => s.isPlaying);
  const isPointerLocked = useWorldStore((s) => s.isPointerLocked);
  const isMobile = useWorldStore((s) => s.isMobile);
  const joystickInput = useWorldStore((s) => s.joystickInput);
  const playerRotation = useWorldStore((s) => s.playerRotation);
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);

  // Keyboard state
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  // Handle keyboard input on window (not canvas)
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

  // Mouse look handler (for pointer lock mode)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const store = useWorldStore.getState();
    if (!store.isPointerLocked || store.isPaused) return;

    const sensitivity = 0.002;
    store.setPlayerRotation({
      x: Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, store.playerRotation.x - e.movementY * sensitivity)),
      y: store.playerRotation.y - e.movementX * sensitivity,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    // Detect mobile
    const checkMobile = () => {
      const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      useWorldStore.getState().setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', checkMobile);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove]);

  useFrame((_, delta) => {
    // Only move if playing (locked on desktop, or mobile)
    const canMove = isMobile ? isPlaying : (isPointerLocked && !isPaused);
    if (!canMove) return;

    // Apply camera rotation from store
    const rot = useWorldStore.getState().playerRotation;
    camera.rotation.set(rot.x, rot.y, 0, 'YXZ');

    // Determine movement input
    const speed = keys.current.sprint ? sprintSpeed : walkSpeed;
    const forward = keys.current.forward || (isMobile && joystickInput.y < -0.2);
    const backward = keys.current.backward || (isMobile && joystickInput.y > 0.2);
    const left = keys.current.left || (isMobile && joystickInput.x < -0.2);
    const right = keys.current.right || (isMobile && joystickInput.x > 0.2);

    // Get camera direction (flat, no vertical)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const sideDirection = new THREE.Vector3();
    sideDirection.crossVectors(camera.up, cameraDirection).normalize().negate();

    // Calculate movement direction
    direction.current.set(0, 0, 0);
    if (forward) direction.current.add(cameraDirection);
    if (backward) direction.current.sub(cameraDirection);
    if (left) direction.current.add(sideDirection);
    if (right) direction.current.sub(sideDirection);

    // On mobile, use joystick magnitude for speed
    if (isMobile) {
      const joyMag = Math.sqrt(joystickInput.x ** 2 + joystickInput.y ** 2);
      const mobileSpeed = speed * Math.min(joyMag, 1);
      if (direction.current.length() > 0) {
        direction.current.normalize();
        velocity.current.x = direction.current.x * mobileSpeed;
        velocity.current.z = direction.current.z * mobileSpeed;
      } else {
        velocity.current.x *= 0.85;
        velocity.current.z *= 0.85;
      }
    } else {
      if (direction.current.length() > 0) {
        direction.current.normalize();
        velocity.current.x = direction.current.x * speed;
        velocity.current.z = direction.current.z * speed;
      } else {
        velocity.current.x *= 0.85;
        velocity.current.z *= 0.85;
      }
    }

    // Apply movement
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

  return null;
}
