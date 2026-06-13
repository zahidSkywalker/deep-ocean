'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DraggableProps {
  children: React.ReactNode;
  axis?: 'x' | 'y' | 'z' | 'xy' | 'xz';
  limits?: { min: number; max: number };
  onDrag?: (position: THREE.Vector3) => void;
  damping?: number;
}

export function Draggable({
  children,
  axis = 'x',
  limits,
  onDrag,
  damping = 0.05,
}: DraggableProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const plane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const glRef = useRef<WebGLRenderer | null>(null);

  useEffect(() => {
    // Get the renderer from the canvas element
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rendererInfo = (canvas as any).__three;
      // We'll use document.body.style for cursor changes instead
    }
  }, []);

  const getPlaneNormal = useCallback((): THREE.Vector3 => {
    switch (axis) {
      case 'x': return new THREE.Vector3(0, 1, 0);
      case 'y': return new THREE.Vector3(1, 0, 0);
      case 'z': return new THREE.Vector3(0, 1, 0);
      case 'xy': return new THREE.Vector3(0, 0, 1);
      case 'xz': return new THREE.Vector3(0, 1, 0);
      default: return new THREE.Vector3(0, 1, 0);
    }
  }, [axis]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    if (!groupRef.current) return;

    setIsDragging(true);
    document.body.style.cursor = 'grabbing';

    const normal = getPlaneNormal();
    plane.current.setFromNormalAndCoplanarPoint(normal, groupRef.current.position);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.ray.origin, camera);
    raycaster.ray.intersectPlane(plane.current, intersection.current);

    offset.current.copy(groupRef.current.position).sub(intersection.current);
  }, [camera, getPlaneNormal]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging || !groupRef.current) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.ray.origin, camera);
    raycaster.ray.intersectPlane(plane.current, intersection.current);

    const newPos = intersection.current.clone().add(offset.current);

    const currentPos = groupRef.current.position.clone();
    switch (axis) {
      case 'x':
        newPos.y = currentPos.y;
        newPos.z = currentPos.z;
        break;
      case 'y':
        newPos.x = currentPos.x;
        newPos.z = currentPos.z;
        break;
      case 'z':
        newPos.x = currentPos.x;
        newPos.y = currentPos.y;
        break;
      case 'xy':
        newPos.z = currentPos.z;
        break;
      case 'xz':
        newPos.y = currentPos.y;
        break;
    }

    if (limits) {
      const constrainedPos = new THREE.Vector3();
      constrainedPos.x = Math.max(limits.min, Math.min(limits.max, newPos.x));
      constrainedPos.y = Math.max(limits.min, Math.min(limits.max, newPos.y));
      constrainedPos.z = Math.max(limits.min, Math.min(limits.max, newPos.z));
      groupRef.current.position.copy(constrainedPos);
      onDrag?.(constrainedPos);
    } else {
      groupRef.current.position.copy(newPos);
      onDrag?.(newPos);
    }
  }, [isDragging, axis, limits, camera, onDrag]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = 'auto';
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerOver={() => { if (!isDragging) document.body.style.cursor = 'grab'; }}
      onPointerOut={() => { if (!isDragging) document.body.style.cursor = 'auto'; }}
    >
      {children}
    </group>
  );
}
