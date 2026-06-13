'use client';
import { useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const T = 16;         // tile size in pixels
const S = 3;          // scale factor
const ST = T * S;     // scaled tile = 48px
const MW = 50;        // map width in tiles
const MH = 45;        // map height in tiles
const DAY_SEC = 180;  // 3 real minutes = 1 game day

// Valid tileset tile indices (only non-empty ones)
const GRASS_TILES = [8, 10, 11, 20, 21, 33, 34, 35, 44, 45, 47];
const DARK_GRASS_TILES = [56, 58, 59, 68, 69, 82, 83, 92, 93, 95];
const DIRT_TILES = [104, 106, 107, 116, 117, 129, 130, 131, 140, 141, 143, 152, 154, 155, 164, 165, 177, 178, 179, 188, 189, 191];

// ═══════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const rng = mkRng(42);

// ═══════════════════════════════════════════════════
// MAP GENERATION
// terrain: 0=grass, 1=path, 2=farmland, 3=pond, 4=sand, 5=water
// ═══════════════════════════════════════════════════
function generateMap(): number[][] {
  const map: number[][] = [];
  for (let y = 0; y < MH; y++) {
    map[y] = [];
    for (let x = 0; x < MW; x++) map[y][x] = 0; // all grass
  }

  // Helper
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && x < MW && y >= 0 && y < MH) map[y][x] = v;
  };
  const lineH = (x1: number, x2: number, y: number, v: number) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) set(x, y, v);
  };
  const lineV = (y1: number, y2: number, x: number, v: number) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) set(x, y, v);
  };

  // ── Main path: vertical from house (col 24) going south ──
  lineV(10, 40, 24, 1);
  // Widen path to 2 tiles
  lineV(10, 40, 25, 1);

  // ── West branch to farm ──
  lineH(24, 14, 20, 1);
  // ── East branch to animals ──
  lineH(24, 38, 20, 1);

  // ── Farm path south from branch ──
  lineV(20, 28, 14, 1);

  // ── Animal path south from branch ──
  lineV(20, 28, 38, 1);

  // ── Path to pond ──
  lineV(20, 32, 12, 1);
  lineH(12, 8, 32, 1);

  // ── Farmland area ──
  for (let y = 17; y <= 27; y++)
    for (let x = 7; x <= 18; x++)
      if (map[y][x] === 0) map[y][x] = 2;

  // ── Pond (ellipse centered at 10, 36) ──
  for (let y = 32; y <= 40; y++)
    for (let x = 5; x <= 15; x++) {
      const dx = (x - 10) / 5.5, dy = (y - 36) / 4.5;
      if (dx * dx + dy * dy <= 1) map[y][x] = 5;
    }
  // Sandy edges
  for (let y = 31; y <= 41; y++)
    for (let x = 4; x <= 16; x++) {
      if (map[y][x] === 5) continue;
      let adj = false;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < MH && nx >= 0 && nx < MW && map[ny][nx] === 5) adj = true;
        }
      if (adj && map[y][x] === 0) map[y][x] = 4;
    }

  return map;
}

// ═══════════════════════════════════════════════════
// OBJECTS
// ═══════════════════════════════════════════════════
interface Obj { type: string; x: number; y: number; v: number; sortY: number; }

function generateObjects(): Obj[] {
  const objs: Obj[] = [];
  const addTree = (x: number, y: number, v: number) => {
    objs.push({ type: 'tree', x, y, v: v % 5, sortY: y + 2 });
  };

  // Border trees (dense)
  for (let x = 1; x < MW - 1; x++) { if (rng() < 0.7) addTree(x, 0, rng() * 5 | 0); if (rng() < 0.5) addTree(x, 1, rng() * 5 | 0); }
  for (let x = 1; x < MW - 1; x++) { if (rng() < 0.5) addTree(x, MH - 2, rng() * 5 | 0); if (rng() < 0.7) addTree(x, MH - 1, rng() * 5 | 0); }
  for (let y = 2; y < MH - 2; y++) { if (rng() < 0.7) addTree(0, y, rng() * 5 | 0); if (rng() < 0.5) addTree(1, y, rng() * 5 | 0); }
  for (let y = 2; y < MH - 2; y++) { if (rng() < 0.5) addTree(MW - 2, y, rng() * 5 | 0); if (rng() < 0.7) addTree(MW - 1, y, rng() * 5 | 0); }

  // Clusters
  const clusters = [[3, 2, 5, 3], [42, 2, 6, 3], [3, 38, 4, 4], [42, 36, 6, 6], [28, 30, 3, 2]];
  for (const [cx, cy, w, h] of clusters)
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (rng() < 0.6) addTree(cx + dx, cy + dy, rng() * 5 | 0);

  // Scattered
  for (const [x, y] of [[8, 10], [35, 8], [44, 12], [20, 35], [30, 5], [15, 14], [46, 22], [4, 28], [48, 30]])
    addTree(x, y, rng() * 5 | 0);

  // Flowers
  for (const [x, y] of [[22, 13], [27, 14], [20, 16], [5, 25], [45, 10], [30, 32], [38, 8], [10, 10], [22, 30], [44, 14]])
    objs.push({ type: 'flower', x, y, v: rng() * 3 | 0, sortY: y });

  // Rocks
  for (const [x, y] of [[16, 12], [38, 14], [5, 30], [45, 20], [30, 8], [40, 32], [10, 16]])
    objs.push({ type: 'rock', x, y, v: 0, sortY: y });

  // Chest
  objs.push({ type: 'chest', x: 30, y: 9, v: 0, sortY: 9 });

  return objs;
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function FarmScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;
    let rafId = 0;

    async function init() {
      // Load images
      const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => {
        const img = new Image(); img.onload = () => ok(img); img.onerror = () => no(new Error(src)); img.src = src;
      });
      let tileset: HTMLImageElement | null = null;
      let walkImg: HTMLImageElement | null = null;
      let idleImg: HTMLImageElement | null = null;
      let treeImg: HTMLImageElement | null = null;
      let houseImg: HTMLImageElement | null = null;
      let chestImg: HTMLImageElement | null = null;
      let cropImg: HTMLImageElement | null = null;
      let fenceImg: HTMLImageElement | null = null;

      await Promise.allSettled([
        load('/assets/tileset/Tileset Spring.png').then(i => tileset = i),
        load('/assets/sprites/Walk.png').then(i => walkImg = i),
        load('/assets/sprites/Idle.png').then(i => idleImg = i),
        load('/assets/objects/Maple Tree.png').then(i => treeImg = i),
        load('/assets/objects/House.png').then(i => houseImg = i),
        load('/assets/objects/chest.png').then(i => chestImg = i),
        load('/assets/objects/Spring Crops.png').then(i => cropImg = i),
        load("/assets/objects/Fence's copiar.png").then(i => fenceImg = i),
      ]);

      if (!running || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      resize();
      window.addEventListener('resize', resize);

      // Generate world
      const map = generateMap();
      const objects = generateObjects();

      // Pre-generate grass overlay positions
      const grassOverlays: { x: number; y: number; tile: number }[] = [];
      for (let y = 0; y < MH; y++)
        for (let x = 0; x < MW; x++)
          if (map[y][x] === 0 && rng() < 0.12)
            grassOverlays.push({ x, y, tile: GRASS_TILES[rng() * GRASS_TILES.length | 0] });

      // Color variation per grass tile
      const grassVariation: number[][] = [];
      for (let y = 0; y < MH; y++) {
        grassVariation[y] = [];
        for (let x = 0; x < MW; x++)
          grassVariation[y][x] = (rng() - 0.5) * 20;
      }

      // Camera
      let camX = 0, camY = 0;

      // Time
      let gameTime = 6.0;
      let dayCount = 1;

      // Farmer
      const farmer = { x: 24, y: 10, tx: 24, ty: 10, dir: 0, frame: 0, ft: 0, moving: false, state: 'idle', st: 0 };
      const SPEED = 2.0;

      // Waypoints
      interface WP { x: number; y: number; action?: string; wait: number; }
      const routines: { hour: number; wps: WP[] }[] = [
        { hour: 5, wps: [{ x: 24, y: 10, wait: 3 }, { x: 14, y: 20, action: 'farm', wait: 90 }] },
        { hour: 8, wps: [{ x: 14, y: 20, wait: 2 }, { x: 24, y: 20, wait: 2 }, { x: 38, y: 22, action: 'animals', wait: 90 }] },
        { hour: 10, wps: [{ x: 38, y: 20, wait: 2 }, { x: 30, y: 15, wait: 10 }, { x: 20, y: 14, wait: 10 }, { x: 24, y: 16, wait: 10 }] },
        { hour: 15, wps: [{ x: 24, y: 20, wait: 2 }, { x: 12, y: 20, wait: 2 }, { x: 10, y: 34, action: 'pond', wait: 60 }] },
        { hour: 17, wps: [{ x: 10, y: 20, wait: 2 }, { x: 24, y: 20, wait: 2 }, { x: 24, y: 10, wait: 120 }] },
        { hour: 19, wps: [{ x: 24, y: 10, action: 'sleep', wait: 600 }] },
      ];
      let rIdx = 0, wIdx = 0, waiting = false;

      const getRoutine = () => { let best = routines[0]; for (const r of routines) if (gameTime >= r.hour) best = r; return best; };

      // Animals
      interface Animal { x: number; y: number; tx: number; ty: number; type: string; color: string; v: number; dir: number; frame: number; ft: number; st: number; moving: boolean; }
      const animalBounds = { x1: 37, x2: 44, y1: 21, y2: 27 };
      const animals: Animal[] = [
        { x: 39, y: 23, tx: 39, ty: 23, type: 'chicken', color: '#e04040', v: 0, dir: 0, frame: 0, ft: 0, st: rng() * 3, moving: false },
        { x: 41, y: 25, tx: 41, ty: 25, type: 'chicken', color: '#f0e060', v: 1, dir: 1, frame: 0, ft: 0, st: rng() * 3, moving: false },
        { x: 43, y: 22, tx: 43, ty: 22, type: 'chicken', color: '#f0e060', v: 2, dir: 2, frame: 0, ft: 0, st: rng() * 3, moving: false },
        { x: 39, y: 26, tx: 39, ty: 26, type: 'cow', color: '#8B6340', v: 0, dir: 0, frame: 0, ft: 0, st: rng() * 5, moving: false },
        { x: 42, y: 24, tx: 42, ty: 24, type: 'cow', color: '#6B4830', v: 1, dir: 1, frame: 0, ft: 0, st: rng() * 5, moving: false },
      ];

      // Stars
      const stars = Array.from({ length: 80 }, () => ({
        x: rng() * MW * ST, y: rng() * MH * ST,
        b: 0.3 + rng() * 0.7, sp: 1 + rng() * 3,
      }));

      // Particles
      interface Ptc { x: number; y: number; vx: number; vy: number; life: number; max: number; type: string; color: string; sz: number; ph: number; }
      const ptcs: Ptc[] = [];

      // Crops state
      const cropStages: Map<string, number> = new Map();

      // ── UPDATE ──
      function moveToward(e: { x: number; y: number; tx: number; ty: number; dir: number; frame: number; ft: number; moving: boolean }, spd: number, dt: number) {
        if (!e.moving) return;
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.1) { e.x = e.tx; e.y = e.ty; e.moving = false; return; }
        const ms = spd * dt;
        e.x += (dx / d) * ms;
        e.y += (dy / d) * ms;
        e.dir = Math.abs(dx) > Math.abs(dy) * 0.5 ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
        e.ft += dt;
        if (e.ft > 0.15) { e.ft -= 0.15; e.frame = (e.frame + 1) % 4; }
      }

      function updateFarmer(dt: number) {
        // Check routine change
        const newR = getRoutine();
        if (routines.indexOf(newR) !== rIdx) { rIdx = routines.indexOf(newR); wIdx = 0; waiting = false; }

        if (waiting) {
          farmer.ft += dt;
          if (farmer.ft > 0.5) { farmer.ft -= 0.5; farmer.frame = (farmer.frame + 1) % 2; }
          farmer.st -= dt;
          if (farmer.st <= 0) { wIdx++; waiting = false; }
          return;
        }

        const routine = routines[rIdx];
        const wp = routine.wps[Math.min(wIdx, routine.wps.length - 1)];
        if (!farmer.moving) { farmer.tx = wp.x; farmer.ty = wp.y; farmer.moving = true; }

        moveToward(farmer, SPEED, dt);

        if (!farmer.moving) {
          farmer.state = wp.action || 'idle';
          waiting = true;
          farmer.st = wp.wait;
          farmer.ft = 0;
          farmer.dir = 0;
          farmer.frame = 0;
        }

        // Dust
        if (farmer.moving && rng() < 0.1) {
          ptcs.push({ x: farmer.x + (rng() - 0.5), y: farmer.y + 0.5, vx: (rng() - 0.5) * 0.3, vy: -0.2 - rng() * 0.2, life: 0, max: 0.4 + rng() * 0.3, type: 'dust', color: '#c9a96e', sz: 1 + rng(), ph: 0 });
        }
      }

      function updateAnimal(a: Animal, dt: number) {
        a.st -= dt;
        if (!a.moving) {
          if (a.st <= 0) {
            if (rng() < 0.6) {
              a.tx = animalBounds.x1 + 1 + rng() * (animalBounds.x2 - animalBounds.x1 - 2);
              a.ty = animalBounds.y1 + 1 + rng() * (animalBounds.y2 - animalBounds.y1 - 2);
              a.moving = true;
              a.st = 3 + rng() * 5;
            } else {
              a.st = 2 + rng() * 4;
            }
          }
          a.ft += dt;
          if (a.ft > 0.6) { a.ft -= 0.6; a.frame = (a.frame + 1) % 2; }
        } else {
          moveToward(a, a.type === 'cow' ? 0.6 : 1.4, dt);
          if (!a.moving) a.st = 1 + rng() * 3;
        }
      }

      function updateParticles(dt: number, t: number) {
        const hour = gameTime % 24;
        const isDay = hour >= 6 && hour < 19;
        if (isDay) {
          if (rng() < 0.008) ptcs.push({ x: (camX / ST + rng() * canvas.width / ST), y: (camY / ST + rng() * canvas.height / ST), vx: (rng() - 0.5) * 0.6, vy: (rng() - 0.5) * 0.3, life: 0, max: 8 + rng() * 10, type: 'butterfly', color: ['#f9a8d4', '#fbbf24', '#a78bfa', '#34d399'][rng() * 4 | 0], sz: 2 + rng() * 2, ph: rng() * 6.28 });
          if (rng() < 0.005) ptcs.push({ x: (camX / ST + rng() * canvas.width / ST), y: (camY / ST + rng() * canvas.height / ST), vx: 0.3 + rng() * 0.5, vy: 0.1 + rng() * 0.2, life: 0, max: 5 + rng() * 8, type: 'seed', color: '#fef3c7', sz: 1 + rng(), ph: rng() * 6.28 });
        } else {
          if (rng() < 0.02) ptcs.push({ x: (camX / ST + rng() * canvas.width / ST), y: (camY / ST + rng() * canvas.height / ST), vx: (rng() - 0.5) * 0.2, vy: (rng() - 0.5) * 0.2, life: 0, max: 3 + rng() * 5, type: 'firefly', color: '#fde047', sz: 2 + rng() * 2, ph: rng() * 6.28 });
        }
        for (let i = ptcs.length - 1; i >= 0; i--) {
          const p = ptcs[i];
          p.life += dt;
          if (p.life > p.max) { ptcs.splice(i, 1); continue; }
          p.x += (p.vx + (p.type === 'butterfly' ? Math.sin(t * 2 + p.ph) * 0.3 : 0)) * dt;
          p.y += (p.vy + (p.type === 'firefly' ? Math.cos(t * 2.5 + p.ph) * 0.1 : 0)) * dt;
        }
      }

      // ── RENDER ──
      function render(t: number) {
        const w = canvas.width, h = canvas.height;
        ctx.imageSmoothingEnabled = false;

        // Visible tile range
        const sx = Math.max(0, Math.floor(camX / ST) - 1);
        const sy = Math.max(0, Math.floor(camY / ST) - 1);
        const ex = Math.min(MW, Math.ceil((camX + w) / ST) + 1);
        const ey = Math.min(MH, Math.ceil((camY + h) / ST) + 1);

        // ── Ground tiles ──
        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            const px = x * ST - camX;
            const py = y * ST - camY;
            const terrain = map[y][x];
            const v = grassVariation[y][x];

            if (terrain === 0) {
              // Grass
              const g = Math.max(0, Math.min(255, 130 + v));
              const r = Math.max(0, Math.min(255, 75 + v * 0.5));
              ctx.fillStyle = `rgb(${r | 0},${g | 0},48)`;
            } else if (terrain === 1) {
              // Path
              ctx.fillStyle = (x + y) % 2 === 0 ? '#c49a6c' : '#b8905f';
            } else if (terrain === 2) {
              // Farmland
              ctx.fillStyle = '#8B6914';
            } else if (terrain === 4) {
              // Sand
              ctx.fillStyle = '#d4b896';
            } else if (terrain === 5) {
              // Water
              const wp = Math.floor(t * 1.5) % 4;
              const wb = wp === 0 ? 10 : wp === 1 ? 0 : wp === 2 ? -10 : 0;
              ctx.fillStyle = `rgb(${74 + wb | 0},${144 + wb | 0},${217 + wb | 0})`;
            }
            ctx.fillRect(px, py, ST + 1, ST + 1);

            // Farmland row lines
            if (terrain === 2) {
              ctx.fillStyle = '#6B5210';
              ctx.fillRect(px, py + ST / 2 - 1, ST + 1, 2);
            }
          }
        }

        // ── Grass overlay tiles (scatter a few tileset tiles on grass) ──
        if (tileset) {
          for (const go of grassOverlays) {
            if (go.x < sx - 1 || go.x > ex + 1 || go.y < sy - 1 || go.y > ey + 1) continue;
            if (map[go.y][go.x] !== 0) continue;
            const px = go.x * ST - camX;
            const py = go.y * ST - camY;
            const col = go.tile % 12;
            const row = (go.tile / 12) | 0;
            ctx.drawImage(tileset, col * T, row * T, T, T, px, py, ST, ST);
          }
        }

        // ── Water shimmer ──
        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            if (map[y][x] === 5) {
              const px = x * ST - camX;
              const py = y * ST - camY;
              const sh = Math.sin(t * 3 + x * 2 + y * 1.5) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(200,230,255,${sh * 0.2})`;
              ctx.fillRect(px, py, ST, ST);
            }
          }
        }

        // ── Collect Y-sorted drawables ──
        interface Draw { sortY: number; fn: () => void; }
        const draws: Draw[] = [];

        // -- House (14x7 tiles = 224x112px) --
        if (houseImg) {
          draws.push({
            sortY: 2 + 7,
            fn: () => {
              const px = 18 * ST - camX;
              const py = 2 * ST - camY;
              ctx.drawImage(houseImg, 0, 0, 224, 112, px, py, 224 * S, 112 * S);
            },
          });
        }

        // -- Fences --
        const drawFence = (x: number, y: number) => {
          draws.push({ sortY: y, fn: () => {
            const px = x * ST - camX;
            const py = y * ST - camY;
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(px + 2, py + 8, ST - 4, 4);
            ctx.fillStyle = '#6b5540';
            ctx.fillRect(px + 4, py + 4, 4, ST - 4);
            ctx.fillRect(px + ST - 8, py + 4, 4, ST - 4);
          }});
        };
        // Farm fences
        for (let x = 6; x <= 19; x++) drawFence(x, 16);
        for (let x = 6; x <= 19; x++) drawFence(x, 28);
        for (let y = 17; y <= 27; y++) { drawFence(6, y); drawFence(19, y); }
        // Animal fences
        for (let x = 36; x <= 45; x++) drawFence(x, 16);
        for (let x = 36; x <= 45; x++) drawFence(x, 28);
        for (let y = 17; y <= 27; y++) { drawFence(36, y); drawFence(45, y); }

        // -- Trees --
        for (const obj of objects) {
          if (obj.type !== 'tree') continue;
          draws.push({ sortY: obj.sortY, fn: () => {
            const px = obj.x * ST - camX;
            const py = obj.y * ST - camY;
            if (treeImg) {
              const tv = obj.v % 5;
              ctx.drawImage(treeImg, tv * 32, 0, 32, 48, px - ST * 0.5, py - ST * 1.5, 32 * S, 48 * S);
            } else {
              // Fallback: canvas-drawn tree
              const sway = Math.sin(t * 0.8 + obj.x * 2 + obj.y) * 1.5;
              ctx.fillStyle = '#6b4226';
              ctx.fillRect(px + ST * 0.4, py + ST * 0.5, ST * 0.2, ST * 1.2);
              ctx.fillStyle = obj.v % 2 === 0 ? '#2d8a2d' : '#3aa03a';
              ctx.beginPath();
              ctx.arc(px + ST * 0.5 + sway, py, ST * 0.7, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = obj.v % 2 === 0 ? '#228022' : '#2d8a2d';
              ctx.beginPath();
              ctx.arc(px + ST * 0.3 + sway, py + ST * 0.2, ST * 0.45, 0, Math.PI * 2);
              ctx.fill();
            }
          }});
        }

        // -- Crops --
        if (cropImg) {
          for (let cy = 17; cy <= 27; cy++) {
            for (let cx = 7; cx <= 18; cx++) {
              if (map[cy]?.[cx] !== 2) continue;
              if ((cx === 14 || cx === 15) && cy >= 19 && cy <= 25) continue; // path gap
              const key = `${cx},${cy}`;
              let stage = cropStages.get(key) || 0;
              stage = Math.min(stage, 4);
              draws.push({
                sortY: cy + 0.5,
                fn: () => {
                  const px = cx * ST - camX;
                  const py = cy * ST - camY;
                  // 4 crop types (rows 0-3), stages across columns (0,3,6,9,12)
                  const typeRow = (cx + cy) % 4;
                  const stageCol = [0, 3, 6, 9, 12][stage];
                  ctx.drawImage(cropImg, stageCol * T, typeRow * T, T, T, px, py, ST, ST);
                },
              });
            }
          }
        }

        // -- Decorations --
        for (const obj of objects) {
          if (obj.type === 'flower') {
            const colors = ['#e04040', '#e0d040', '#d060d0'];
            draws.push({ sortY: obj.sortY, fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              ctx.fillStyle = '#40a030';
              ctx.fillRect(px + 6 * S, py + 8 * S, 2 * S, 5 * S);
              ctx.fillStyle = colors[obj.v % 3];
              ctx.fillRect(px + 4 * S, py + 5 * S, 6 * S, 4 * S);
              ctx.fillStyle = '#f0f060';
              ctx.fillRect(px + 6 * S, py + 6 * S, 2 * S, 2 * S);
            }});
          } else if (obj.type === 'rock') {
            draws.push({ sortY: obj.sortY, fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              ctx.fillStyle = '#888';
              ctx.fillRect(px + 3 * S, py + 6 * S, 10 * S, 8 * S);
              ctx.fillStyle = '#666';
              ctx.fillRect(px + 4 * S, py + 7 * S, 4 * S, 3 * S);
            }});
          } else if (obj.type === 'chest') {
            draws.push({ sortY: obj.sortY, fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              if (chestImg) ctx.drawImage(chestImg, 0, 0, 16, 16, px, py, ST, ST);
              else { ctx.fillStyle = '#8B6914'; ctx.fillRect(px + 2 * S, py + 4 * S, 12 * S, 8 * S); ctx.fillStyle = '#c49a6c'; ctx.fillRect(px + 2 * S, py + 4 * S, 12 * S, 2 * S); }
            }});
          }
        }

        // -- Animals --
        for (const a of animals) {
          draws.push({ sortY: a.y + 0.8, fn: () => {
            const px = a.x * ST - camX;
            const py = a.y * ST - camY;
            if (a.type === 'cow') {
              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              ctx.beginPath(); ctx.ellipse(px + ST * 0.8, py + ST * 1.8, ST * 0.5, ST * 0.12, 0, 0, 6.28); ctx.fill();
              ctx.fillStyle = a.color;
              ctx.fillRect(px + 2 * S, py + 4 * S, 28 * S / 3, 16 * S / 3);
              ctx.fillStyle = '#fff';
              ctx.fillRect(px + 20 * S / 3, py + 6 * S / 3, 6 * S / 3, 4 * S / 3);
              ctx.fillStyle = '#5a3a1a';
              for (let lx of [4, 10, 18, 24]) ctx.fillRect(px + lx, py + 16 * S / 3, 2, 4);
              // Head
              ctx.fillStyle = a.color;
              const hdir = a.dir === 1 ? -6 : a.dir === 2 ? 28 : 10;
              ctx.fillRect(px + hdir, py + 2 * S, 8 * S, 8 * S);
            } else {
              // Chicken
              ctx.fillStyle = 'rgba(0,0,0,0.08)';
              ctx.beginPath(); ctx.ellipse(px + ST * 0.4, py + ST * 0.8, ST * 0.25, ST * 0.08, 0, 0, 6.28); ctx.fill();
              ctx.fillStyle = a.color;
              ctx.fillRect(px + 4 * S, py + 6 * S, 8 * S, 6 * S);
              ctx.fillStyle = '#e0a020';
              ctx.fillRect(px + 10 * S, py + 7 * S, 4 * S, 2 * S);
              ctx.fillStyle = '#2a2a2a';
              ctx.fillRect(px + 4 * S, py + 4 * S, 2 * S, 2 * S);
              ctx.fillStyle = '#e0a020';
              ctx.fillRect(px + 5 * S, py + 12 * S, 1, 3);
              ctx.fillRect(px + 9 * S, py + 12 * S, 1, 3);
            }
          }});
        }

        // -- Farmer --
        draws.push({ sortY: farmer.y + 0.8, fn: () => {
          const px = farmer.x * ST - camX;
          const py = farmer.y * ST - camY;
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.ellipse(px + ST * 0.5, py + ST * 1.8, ST * 0.35, ST * 0.1, 0, 0, 6.28); ctx.fill();

          // Try sprite
          const sheet = farmer.moving ? walkImg : idleImg;
          if (sheet) {
            const cols = farmer.moving ? 12 : 8;
            const numFrames = farmer.moving ? 3 : 2;
            const f = farmer.frame % numFrames;
            const d = farmer.dir;
            // Direction = row, frames start at col 0
            const tileIdx = d * cols + f;
            const srcCol = tileIdx % cols;
            const srcRow = (tileIdx / cols) | 0;
            ctx.drawImage(sheet, srcCol * T, srcRow * T, T, T, px, py, ST, ST);
          } else {
            // Fallback farmer
            const skinColor = '#f0c090';
            const shirtColor = '#4060c0';
            const pantsColor = '#604020';
            ctx.fillStyle = pantsColor;
            ctx.fillRect(px + 4 * S, py + 10 * S, 8 * S, 6 * S);
            ctx.fillStyle = shirtColor;
            ctx.fillRect(px + 3 * S, py + 5 * S, 10 * S, 6 * S);
            ctx.fillStyle = skinColor;
            ctx.fillRect(px + 5 * S, py + 1 * S, 6 * S, 5 * S);
            // Eyes
            ctx.fillStyle = '#2a2a2a';
            if (farmer.dir === 0) { ctx.fillRect(px + 6 * S, py + 3 * S, S, S); ctx.fillRect(px + 9 * S, py + 3 * S, S, S); }
            else if (farmer.dir === 3) { /* back of head */ }
            else if (farmer.dir === 1) { ctx.fillRect(px + 5 * S, py + 3 * S, S, S); }
            else { ctx.fillRect(px + 10 * S, py + 3 * S, S, S); }
            // Hair
            ctx.fillStyle = '#6b3a1a';
            ctx.fillRect(px + 5 * S, py, 6 * S, 2 * S);
          }
        }});

        // Sort and draw
        draws.sort((a, b) => a.sortY - b.sortY);
        for (const d of draws) d.fn();

        // ── Day/Night overlay ──
        const hour = gameTime % 24;
        let overlay = '';
        let overlayAlpha = 0;
        if (hour >= 5 && hour < 7) {
          const f = (hour - 5) / 2;
          overlay = `rgba(255,180,80,${(0.2 * (1 - f)).toFixed(3)})`;
          overlayAlpha = 0.2 * (1 - f);
        } else if (hour >= 17 && hour < 19) {
          const f = (hour - 17) / 2;
          overlay = `rgba(200,80,40,${(0.15 * f).toFixed(3)})`;
          overlayAlpha = 0.15 * f;
        } else if (hour >= 19 && hour < 20) {
          const f = hour - 19;
          overlay = `rgba(10,10,50,${(0.4 * f).toFixed(3)})`;
          overlayAlpha = 0.4 * f;
        } else if (hour >= 20 || hour < 5) {
          overlay = 'rgba(10,10,50,0.4)';
          overlayAlpha = 0.4;
        }
        if (overlayAlpha > 0) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, w, h); }

        // ── Stars ──
        if (hour >= 19.5 || hour < 5) {
          let sa = 1;
          if (hour >= 19.5) sa = Math.min(1, (hour - 19.5) * 2);
          else sa = Math.min(1, (5 - hour) * 2);
          for (const s of stars) {
            const stx = s.x - camX, sty = s.y - camY;
            if (stx < -10 || stx > w + 10 || sty < -10 || sty > h + 10) continue;
            const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.x);
            ctx.fillStyle = `rgba(255,255,230,${s.b * tw * sa})`;
            ctx.fillRect(stx, sty, 2, 2);
          }
        }

        // ── Particles ──
        for (const p of ptcs) {
          const px = p.x * ST - camX;
          const py = p.y * ST - camY;
          if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;
          const lr = p.life / p.max;
          const al = lr < 0.1 ? lr * 10 : lr > 0.8 ? (1 - lr) * 5 : 1;
          if (p.type === 'butterfly') {
            const wf = Math.sin(t * 12 + p.ph) * 3;
            ctx.fillStyle = p.color; ctx.globalAlpha = al;
            ctx.fillRect(px - wf - p.sz, py - p.sz * 0.5, p.sz, p.sz);
            ctx.fillRect(px + wf, py - p.sz * 0.5, p.sz, p.sz);
            ctx.globalAlpha = 1;
          } else if (p.type === 'firefly') {
            const gl = 0.5 + 0.5 * Math.sin(t * 5 + p.ph);
            const r = p.sz * (0.8 + gl * 0.4);
            ctx.fillStyle = `rgba(253,224,71,${al * gl * 0.8})`;
            ctx.beginPath(); ctx.arc(px, py, r, 0, 6.28); ctx.fill();
            ctx.fillStyle = `rgba(253,224,71,${al * gl * 0.2})`;
            ctx.beginPath(); ctx.arc(px, py, r * 2.5, 0, 6.28); ctx.fill();
          } else if (p.type === 'seed') {
            ctx.fillStyle = `rgba(254,243,199,${al * 0.7})`;
            ctx.fillRect(px, py, p.sz, p.sz);
          } else if (p.type === 'dust') {
            ctx.fillStyle = `rgba(196,167,106,${al * 0.5})`;
            ctx.fillRect(px, py, p.sz, p.sz);
          }
        }

        // ── UI ──
        drawUI(w);
      }

      function drawUI(w: number) {
        const hour = gameTime % 24;
        const h12 = hour % 12 || 12;
        const mm = Math.floor((hour % 1) * 60);
        const ampm = hour < 12 ? 'AM' : 'PM';
        const timeStr = `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;

        // Panel
        const pw = 140, ph = 72, px = w - pw - 12, py = 12;
        ctx.fillStyle = 'rgba(20,15,10,0.7)';
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(180,150,100,0.4)'; ctx.lineWidth = 1; ctx.stroke();

        // Sun/moon icon
        const ix = px + 18, iy = py + 20;
        if (hour >= 6 && hour < 19) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath(); ctx.arc(ix, iy, 6, 0, 6.28); ctx.fill();
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
          const gt = performance.now() / 1000;
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * 6.28 + gt * 0.3;
            ctx.beginPath();
            ctx.moveTo(ix + Math.cos(ang) * 8, iy + Math.sin(ang) * 8);
            ctx.lineTo(ix + Math.cos(ang) * 10, iy + Math.sin(ang) * 10);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath(); ctx.arc(ix, iy, 6, 0, 6.28); ctx.fill();
          ctx.fillStyle = 'rgba(20,15,10,0.8)';
          ctx.beginPath(); ctx.arc(ix + 2, iy - 1, 5, 0, 6.28); ctx.fill();
        }

        ctx.fillStyle = '#e8d5b7'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
        ctx.fillText(timeStr, px + 32, py + 24);
        ctx.fillStyle = '#a89070'; ctx.font = '11px monospace';
        ctx.fillText(`Day ${dayCount}`, px + 12, py + 44);
        ctx.fillStyle = '#7cba5c';
        ctx.fillText('Spring', px + 72, py + 44);

        const stateText = farmer.state === 'farm' ? 'Tending crops' : farmer.state === 'animals' ? 'Checking animals' : farmer.state === 'pond' ? 'Admiring pond' : farmer.state === 'sleep' ? 'Sleeping...' : farmer.moving ? 'Walking...' : 'Idle';
        ctx.fillStyle = 'rgba(168,144,112,0.6)'; ctx.font = '10px monospace';
        ctx.fillText(stateText, px + 12, py + 62);
      }

      // ── GAME LOOP ──
      let last = performance.now();

      function loop(ts: number) {
        if (!running) return;
        const dt = Math.min((ts - last) / 1000, 0.1);
        last = ts;

        // Update time
        gameTime += (24 / DAY_SEC) * dt;
        if (gameTime >= 24) { gameTime -= 24; dayCount++; cropStages.clear(); }

        // Grow crops slowly
        for (let cy = 17; cy <= 27; cy++)
          for (let cx = 7; cx <= 18; cx++) {
            if (map[cy]?.[cx] !== 2) continue;
            const key = `${cx},${cy}`;
            let st = cropStages.get(key) || 0;
            if (st < 4) { st += dt * 0.01; if (st >= (cropStages.get(key) || 0) + 1) cropStages.set(key, Math.floor(st)); }
            cropStages.set(key, Math.min(st, 4));
          }

        // Update entities
        updateFarmer(dt);
        for (const a of animals) updateAnimal(a, dt);
        updateParticles(dt, ts / 1000);

        // Camera: follow farmer
        const tx = farmer.x * ST - canvas.width / 2 + ST / 2;
        const ty = farmer.y * ST - canvas.height / 2 + ST / 2;
        const lf = 1 - Math.pow(0.02, dt);
        camX += (tx - camX) * lf;
        camY += (ty - camY) * lf;
        camX = Math.max(0, Math.min(MW * ST - canvas.width, camX));
        camY = Math.max(0, Math.min(MH * ST - canvas.height, camY));

        render(ts / 1000);
        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
      return () => { running = false; cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); };
    }

    init();
    return () => { running = false; };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100vw', height: '100vh', imageRendering: 'pixelated' }}
    />
  );
}