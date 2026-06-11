'use client';

import { useMemo } from 'react';
import { useWorldStore } from '@/store/useWorldStore';

const BLOCK_SIZE = 40;
const STREET_WIDTH = 16;
const GRID_RANGE = 4;

/* ─── Crosswalks at intersections ─── */
function Crosswalks() {
  const crosswalks = useMemo(() => {
    const cw: { pos: [number, number, number]; rot: [number, number, number]; size: [number, number, number] }[] = [];
    for (let gx = -GRID_RANGE; gx <= GRID_RANGE; gx++) {
      for (let gz = -GRID_RANGE; gz <= GRID_RANGE; gz++) {
        const cx = gx * (BLOCK_SIZE + STREET_WIDTH) + BLOCK_SIZE / 2;
        const cz = gz * (BLOCK_SIZE + STREET_WIDTH) + BLOCK_SIZE / 2;

        // Crosswalk stripes on each side of intersection
        // North side (going up)
        for (let s = 0; s < 5; s++) {
          cw.push({
            pos: [cx + (s - 2) * 1.2, 0.02, cz + BLOCK_SIZE / 2 + STREET_WIDTH * 0.3],
            rot: [0, 0, 0],
            size: [0.7, 0.01, 3],
          });
        }
        // South side
        for (let s = 0; s < 5; s++) {
          cw.push({
            pos: [cx + (s - 2) * 1.2, 0.02, cz - BLOCK_SIZE / 2 - STREET_WIDTH * 0.3],
            rot: [0, 0, 0],
            size: [0.7, 0.01, 3],
          });
        }
        // East side
        for (let s = 0; s < 5; s++) {
          cw.push({
            pos: [cx + BLOCK_SIZE / 2 + STREET_WIDTH * 0.3, 0.02, cz + (s - 2) * 1.2],
            rot: [0, 0, 0],
            size: [3, 0.01, 0.7],
          });
        }
        // West side
        for (let s = 0; s < 5; s++) {
          cw.push({
            pos: [cx - BLOCK_SIZE / 2 - STREET_WIDTH * 0.3, 0.02, cz + (s - 2) * 1.2],
            rot: [0, 0, 0],
            size: [3, 0.01, 0.7],
          });
        }
      }
    }
    return cw;
  }, []);

  return (
    <group>
      {crosswalks.map((c, i) => (
        <mesh key={`cw-${i}`} position={c.pos} rotation={c.rot} receiveShadow>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color="#dddddd" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Traffic Lights ─── */
function TrafficLights() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let gx = -GRID_RANGE; gx <= GRID_RANGE; gx++) {
      for (let gz = -GRID_RANGE; gz <= GRID_RANGE; gz++) {
        // Only at major intersections (every other one)
        if ((Math.abs(gx) + Math.abs(gz)) % 2 !== 0) continue;
        const cx = gx * (BLOCK_SIZE + STREET_WIDTH);
        const cz = gz * (BLOCK_SIZE + STREET_WIDTH);
        // Two lights per intersection (diagonal corners)
        pos.push([cx + BLOCK_SIZE / 2 + 1.5, 0, cz + BLOCK_SIZE / 2 + 1.5]);
        pos.push([cx - BLOCK_SIZE / 2 - 1.5, 0, cz - BLOCK_SIZE / 2 - 1.5]);
      }
    }
    return pos;
  }, []);

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`traffic-${i}`} position={pos}>
          {/* Pole */}
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 6, 6]} />
            <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Arm */}
          <mesh position={[0.5, 5.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 1, 4]} />
            <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Light housing */}
          <mesh position={[0, 6.2, 0]}>
            <boxGeometry args={[0.35, 1.0, 0.25]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
          {/* Red light */}
          <mesh position={[0, 6.45, 0.13]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={1.5}
            />
          </mesh>
          {/* Yellow light */}
          <mesh position={[0, 6.2, 0.13]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Green light */}
          <mesh position={[0, 5.95, 0.13]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color="#00aa00"
              emissive="#00ff00"
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Visor hood */}
          <mesh position={[0, 6.2, 0.26]}>
            <boxGeometry args={[0.4, 1.1, 0.15]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Park Benches along sidewalks ─── */
function ParkBenches() {
  const benches = useMemo(() => {
    const b: { pos: [number, number, number]; rot: number }[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s * 43758.5453) * 12345.6789;
      return x - Math.floor(x);
    };
    let count = 0;
    for (let i = 0; i < 80 && count < 50; i++) {
      const gx = Math.floor(rng(i * 1.1 + 100) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const gz = Math.floor(rng(i * 2.3 + 200) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const cx = gx * (BLOCK_SIZE + STREET_WIDTH);
      const cz = gz * (BLOCK_SIZE + STREET_WIDTH);

      // Place along one side of the road
      const along = (rng(i * 3.7 + 300) - 0.5) * BLOCK_SIZE;
      const side = rng(i * 4.1 + 400) > 0.5 ? 1 : -1;

      b.push({
        pos: [cx + along, 0.3, cz + side * (STREET_WIDTH / 2 + 1)],
        rot: side > 0 ? 0 : Math.PI,
      });
      count++;
    }
    return b;
  }, []);

  return (
    <group>
      {benches.map((b, i) => (
        <group key={`bench-${i}`} position={b.pos} rotation={[0, b.rot, 0]}>
          {/* Seat */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[1.5, 0.08, 0.5]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </mesh>
          {/* Back rest */}
          <mesh position={[0, 0.6, -0.2]} castShadow>
            <boxGeometry args={[1.5, 0.5, 0.06]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.6, 0.15, 0]}>
            <boxGeometry args={[0.06, 0.3, 0.4]} />
            <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0.6, 0.15, 0]}>
            <boxGeometry args={[0.06, 0.3, 0.4]} />
            <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Trash Cans ─── */
function TrashCans() {
  const cans = useMemo(() => {
    const c: { pos: [number, number, number] }[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s * 43758.5453) * 12345.6789;
      return x - Math.floor(x);
    };
    let count = 0;
    for (let i = 0; i < 100 && count < 60; i++) {
      const gx = Math.floor(rng(i * 1.7 + 500) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const gz = Math.floor(rng(i * 2.9 + 600) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const cx = gx * (BLOCK_SIZE + STREET_WIDTH);
      const cz = gz * (BLOCK_SIZE + STREET_WIDTH);
      const along = (rng(i * 3.3 + 700) - 0.5) * BLOCK_SIZE;
      const side = rng(i * 5.1 + 800) > 0.5 ? 1 : -1;

      c.push({
        pos: [cx + along, 0.4, cz + side * (STREET_WIDTH / 2 + 0.8)],
      });
      count++;
    }
    return c;
  }, []);

  return (
    <group>
      {cans.map((c, i) => (
        <group key={`can-${i}`} position={c.pos}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.25, 0.8, 8]} />
            <meshStandardMaterial color="#445566" roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Lid */}
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 8]} />
            <meshStandardMaterial color="#334455" roughness={0.7} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Fire Hydrants ─── */
function FireHydrants() {
  const hydrants = useMemo(() => {
    const h: { pos: [number, number, number] }[] = [];
    const rng = (s: number) => {
      const x = Math.sin(s * 43758.5453) * 12345.6789;
      return x - Math.floor(x);
    };
    let count = 0;
    for (let i = 0; i < 80 && count < 40; i++) {
      const gx = Math.floor(rng(i * 1.3 + 900) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const gz = Math.floor(rng(i * 2.7 + 1000) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const cx = gx * (BLOCK_SIZE + STREET_WIDTH);
      const cz = gz * (BLOCK_SIZE + STREET_WIDTH);
      const along = (rng(i * 3.1 + 1100) - 0.5) * BLOCK_SIZE;
      const side = rng(i * 4.3 + 1200) > 0.5 ? 1 : -1;

      h.push({
        pos: [cx + along, 0.3, cz + side * (STREET_WIDTH / 2 + 1.2)],
      });
      count++;
    }
    return h;
  }, []);

  return (
    <group>
      {hydrants.map((h, i) => (
        <group key={`hydrant-${i}`} position={h.pos}>
          {/* Base */}
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.5, 0.3]} />
            <meshStandardMaterial color="#cc3333" roughness={0.7} />
          </mesh>
          {/* Top dome */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <sphereGeometry args={[0.18, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#cc3333" roughness={0.7} />
          </mesh>
          {/* Side nozzle */}
          <mesh position={[0.2, 0.15, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.15, 6]} />
            <meshStandardMaterial color="#cc3333" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Road Lane Markings (white edge lines) ─── */
function LaneMarkings() {
  const markings = useMemo(() => {
    const m: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    const totalSpan = (GRID_RANGE * 2 + 1) * (BLOCK_SIZE + STREET_WIDTH);

    for (let gi = -GRID_RANGE; gi <= GRID_RANGE + 1; gi++) {
      const coord = gi * (BLOCK_SIZE + STREET_WIDTH) - STREET_WIDTH / 2;

      // Horizontal road edge lines
      m.push({ pos: [0, 0.015, coord - STREET_WIDTH * 0.45], size: [totalSpan + 40, 0.01, 0.15] });
      m.push({ pos: [0, 0.015, coord + STREET_WIDTH * 0.45], size: [totalSpan + 40, 0.01, 0.15] });

      // Vertical road edge lines
      m.push({ pos: [coord - STREET_WIDTH * 0.45, 0.015, 0], size: [0.15, 0.01, totalSpan + 40] });
      m.push({ pos: [coord + STREET_WIDTH * 0.45, 0.015, 0], size: [0.15, 0.01, totalSpan + 40] });
    }

    return m;
  }, []);

  return (
    <group>
      {markings.map((m, i) => (
        <mesh key={`lane-${i}`} position={m.pos} receiveShadow>
          <boxGeometry args={m.size} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} opacity={0.6} transparent />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Bus Stops ─── */
function BusStops() {
  const stops = useMemo(() => {
    const s: { pos: [number, number, number]; rot: number }[] = [];
    const rng = (s2: number) => {
      const x = Math.sin(s2 * 43758.5453) * 12345.6789;
      return x - Math.floor(x);
    };
    let count = 0;
    for (let i = 0; i < 60 && count < 20; i++) {
      const gi = Math.floor(rng(i * 1.9 + 1300) * (GRID_RANGE * 2 + 1)) - GRID_RANGE;
      const coord = gi * (BLOCK_SIZE + STREET_WIDTH);
      const along = (rng(i * 2.1 + 1400) - 0.5) * (GRID_RANGE * 2 + 1) * (BLOCK_SIZE + STREET_WIDTH);
      const side = rng(i * 3.3 + 1500) > 0.5 ? 1 : -1;
      const isHorizontal = rng(i * 4.7 + 1600) > 0.5;

      if (isHorizontal) {
        s.push({
          pos: [along, 0, coord + side * (STREET_WIDTH / 2 + 1.5)],
          rot: side > 0 ? 0 : Math.PI,
        });
      } else {
        s.push({
          pos: [coord + side * (STREET_WIDTH / 2 + 1.5), 0, along],
          rot: side > 0 ? Math.PI / 2 : -Math.PI / 2,
        });
      }
      count++;
    }
    return s;
  }, []);

  return (
    <group>
      {stops.map((s, i) => (
        <group key={`bus-${i}`} position={s.pos} rotation={[0, s.rot, 0]}>
          {/* Pole */}
          <mesh position={[-0.6, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 3.6, 6]} />
            <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Sign */}
          <mesh position={[-0.6, 3.2, 0.1]} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.05]} />
            <meshStandardMaterial color="#2266aa" roughness={0.5} />
          </mesh>
          {/* Shelter roof */}
          <mesh position={[0.3, 2.8, 0]}>
            <boxGeometry args={[2.0, 0.06, 1.2]} />
            <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.5} transparent opacity={0.7} />
          </mesh>
          {/* Shelter back */}
          <mesh position={[0.3, 2.4, -0.55]}>
            <boxGeometry args={[2.0, 1.0, 0.05]} />
            <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Bench inside */}
          <mesh position={[0.3, 0.45, 0]} castShadow>
            <boxGeometry args={[1.4, 0.06, 0.4]} />
            <meshStandardMaterial color="#8B4513" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Main Urban Details Export ─── */
export default function UrbanDetails() {
  return (
    <group>
      <Crosswalks />
      <LaneMarkings />
      <TrafficLights />
      <ParkBenches />
      <TrashCans />
      <FireHydrants />
      <BusStops />
    </group>
  );
}
