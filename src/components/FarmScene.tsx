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
const TS_COLS = 12;   // tileset columns

// ═══════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════
function mkRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ═══════════════════════════════════════════════════
// TILE ASSIGNMENT
// Pre-assign tileset indices for visual variety
// ═══════════════════════════════════════════════════
// Light grass tiles (rows 0-3, cols 8-11 of tileset)
const GRASS = [8, 10, 11, 20, 21, 33, 34, 35, 44, 45, 47];
// Darker grass (rows 4-7)
const GRASS_DARK = [56, 58, 59, 68, 69, 82, 83, 92, 93, 95];
// Dirt / path tiles (rows 8-15)
const DIRT = [104, 106, 107, 116, 117, 129, 130, 131, 140, 141, 143, 152, 154, 155, 164, 165, 177, 178, 179, 188, 189, 191];
// Farmland / tilled soil
const SOIL = [104, 106, 107, 116, 129, 130, 140, 141];
// Water tiles (rows 16-19)
const WATER = [192, 193, 194, 196, 197, 204, 205, 206, 208, 209, 210];
// Sand tiles
const SAND = [216, 217, 218, 228, 229, 230];

function pick(arr: number[], rng: () => number) { return arr[(rng() * arr.length) | 0]; }

// ═══════════════════════════════════════════════════
// MAP GENERATION
// terrain: 0=grass, 1=path, 2=farmland, 3=pond edge, 4=sand, 5=water
// ═══════════════════════════════════════════════════
function generateMap() {
  const rng = mkRng(777);
  const map: number[][] = [];
  // Tile index map (which tileset tile to draw)
  const tiles: number[][] = [];

  for (let y = 0; y < MH; y++) {
    map[y] = [];
    tiles[y] = [];
    for (let x = 0; x < MW; x++) {
      map[y][x] = 0;
      tiles[y][x] = pick(GRASS, rng);
    }
  }

  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && x < MW && y >= 0 && y < MH) map[y][x] = v;
  };
  const setTile = (x: number, y: number, v: number) => {
    if (x >= 0 && x < MW && y >= 0 && y < MH) tiles[y][x] = v;
  };

  // ── PATHS (3 tiles wide for a nice road feel) ──
  const pathH = (x1: number, x2: number, y: number) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      set(x, y, 1); set(x, y + 1, 1);
    }
  };
  const pathV = (y1: number, y2: number, x: number) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      set(x, y, 1); set(x + 1, y, 1);
    }
  };
  const setPathTiles = () => {
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++)
        if (map[y][x] === 1) tiles[y][x] = pick(DIRT, rng);
  };

  // Main north-south road through center
  pathV(4, 40, 23);
  pathV(4, 40, 24);

  // East-west road
  pathH(5, 45, 18);
  pathH(5, 45, 19);

  // Branch west to farm
  pathV(18, 30, 11);
  pathH(11, 18, 22);

  // Branch east to animals
  pathV(18, 30, 36);
  pathH(24, 36, 22);

  // Branch south to pond
  pathV(20, 35, 10);

  setPathTiles();

  // ── FARM AREA (west side) ──
  for (let y = 23; y <= 32; y++)
    for (let x = 5; x <= 17; x++)
      if (map[y][x] === 0) {
        map[y][x] = 2;
        tiles[y][x] = pick(SOIL, rng);
      }

  // ── POND (southwest, organic ellipse) ──
  for (let y = 33; y <= 42; y++)
    for (let x = 3; x <= 14; x++) {
      const dx = (x - 8.5) / 5.5, dy = (y - 37.5) / 5;
      if (dx * dx + dy * dy <= 1) {
        map[y][x] = 5;
        tiles[y][x] = pick(WATER, rng);
      }
    }
  // Sandy edges
  for (let y = 32; y <= 43; y++)
    for (let x = 2; x <= 15; x++) {
      if (map[y][x] === 5) continue;
      let adj = false;
      for (let dy2 = -1; dy2 <= 1; dy2++)
        for (let dx2 = -1; dx2 <= 1; dx2++) {
          const ny = y + dy2, nx = x + dx2;
          if (ny >= 0 && ny < MH && nx >= 0 && nx < MW && map[ny][nx] === 5) adj = true;
        }
      if (adj && map[y][x] === 0) {
        map[y][x] = 4;
        tiles[y][x] = pick(SAND, rng);
      }
    }

  // Add grass variation to remaining grass tiles
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++)
      if (map[y][x] === 0 && rng() < 0.35)
        tiles[y][x] = pick(GRASS_DARK, rng);

  return { map, tiles };
}

// ═══════════════════════════════════════════════════
// OBJECTS (trees, flowers, rocks, etc.)
// ═══════════════════════════════════════════════════
interface Obj { type: string; x: number; y: number; v: number; sortY: number; }

function generateObjects(): Obj[] {
  const rng = mkRng(42);
  const objs: Obj[] = [];
  const addTree = (x: number, y: number, v: number) => {
    objs.push({ type: 'tree', x, y, v: v % 5, sortY: y + 2.5 });
  };

  // ── Dense border trees ──
  for (let x = 0; x < MW; x++) {
    if (x % 2 === 0) addTree(x, 0, rng() * 5 | 0);
    if (x % 3 === 0) addTree(x, 1, rng() * 5 | 0);
    if (x % 3 === 0) addTree(x, MH - 2, rng() * 5 | 0);
    if (x % 2 === 0) addTree(x, MH - 1, rng() * 5 | 0);
  }
  for (let y = 2; y < MH - 2; y++) {
    if (y % 2 === 0) addTree(0, y, rng() * 5 | 0);
    if (y % 3 === 0) addTree(1, y, rng() * 5 | 0);
    if (y % 3 === 0) addTree(MW - 2, y, rng() * 5 | 0);
    if (y % 2 === 0) addTree(MW - 1, y, rng() * 5 | 0);
  }

  // ── Tree clusters (forested areas) ──
  const clusters: [number, number, number, number][] = [
    [3, 2, 5, 3],     // NW corner
    [42, 2, 6, 3],    // NE corner
    [2, 40, 4, 3],    // SW corner
    [40, 38, 7, 5],   // SE corner
    [28, 32, 4, 3],   // SE interior
  ];
  for (const [cx, cy, w, h] of clusters)
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (rng() < 0.55) addTree(cx + dx, cy + dy, rng() * 5 | 0);

  // ── Scattered individual trees ──
  const treePositions = [
    [7, 10], [35, 8], [44, 12], [20, 36], [30, 5], [15, 14],
    [46, 22], [4, 28], [48, 30], [32, 10], [18, 8], [38, 6],
    [8, 20], [42, 18], [20, 5], [35, 35],
  ];
  for (const [x, y] of treePositions) addTree(x, y, rng() * 5 | 0);

  // ── Flower patches (near house, along paths, near pond) ──
  const flowerSpots = [
    // Near house
    [18, 13], [19, 13], [31, 13], [32, 13],
    [17, 14], [33, 14],
    // Along paths
    [22, 16], [27, 16], [22, 21], [27, 21],
    [21, 25], [28, 25], [21, 30], [28, 30],
    // Near pond
    [15, 34], [16, 36], [15, 38], [2, 36], [3, 38],
    // Scattered
    [38, 10], [42, 14], [8, 15], [45, 25],
  ];
  for (const [x, y] of flowerSpots)
    objs.push({ type: 'flower', x, y, v: rng() * 4 | 0, sortY: y + 0.3 });

  // ── Rocks ──
  const rockSpots = [[16, 12], [38, 14], [5, 30], [45, 20], [30, 8], [40, 32], [10, 16], [35, 6], [12, 38]];
  for (const [x, y] of rockSpots)
    objs.push({ type: 'rock', x, y, v: rng() * 3 | 0, sortY: y + 0.5 });

  // ── Chest near house ──
  objs.push({ type: 'chest', x: 32, y: 12, v: 0, sortY: 12.5 });

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
      const load = (src: string) => new Promise<HTMLImageElement>((ok) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = () => { img.src = ''; ok(img); }; // return blank on error
        img.src = src;
      });

      const [tileset, walkImg, idleImg, treeImg, houseImg, chestImg, cropImg, fenceImg,
             cowMImg, cowFImg, chickenRImg, chickenBImg, chickenYImg] = await Promise.all([
        load('/assets/tileset/Tileset Spring.png'),
        load('/assets/sprites/Walk.png'),
        load('/assets/sprites/Idle.png'),
        load('/assets/objects/Maple Tree.png'),
        load('/assets/objects/House.png'),
        load('/assets/objects/chest.png'),
        load('/assets/objects/Spring Crops.png'),
        load("/assets/objects/Fence's copiar.png"),
        load('/assets/sprites/Male Cow Brown.png'),
        load('/assets/sprites/Female Cow Brown.png'),
        load('/assets/sprites/Chicken Red.png'),
        load('/assets/sprites/Chicken Blonde  Green.png'),
        load('/assets/sprites/Baby Chicken Yellow.png'),
      ]);

      if (!running || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      resize();
      window.addEventListener('resize', resize);

      // Generate world
      const { map, tiles } = generateMap();
      const objects = generateObjects();

      // Camera
      let camX = 24 * ST - canvas.width / 2;
      let camY = 12 * ST - canvas.height / 2;

      // Time
      let gameTime = 6.0;
      let dayCount = 1;

      // Farmer
      const farmer = { x: 24, y: 10, tx: 24, ty: 10, dir: 0, frame: 0, ft: 0, moving: false, state: 'idle', st: 0 };
      const SPEED = 2.5;

      // Waypoints
      interface WP { x: number; y: number; action?: string; wait: number; }
      const routines: { hour: number; wps: WP[] }[] = [
        { hour: 5, wps: [{ x: 24, y: 10, wait: 4 }, { x: 11, y: 23, action: 'farm', wait: 80 }] },
        { hour: 8, wps: [{ x: 11, y: 23, wait: 2 }, { x: 24, y: 19, wait: 2 }, { x: 38, y: 25, action: 'animals', wait: 80 }] },
        { hour: 10, wps: [{ x: 38, y: 19, wait: 3 }, { x: 32, y: 12, wait: 8 }, { x: 20, y: 14, wait: 8 }, { x: 24, y: 16, wait: 8 }] },
        { hour: 14, wps: [{ x: 24, y: 19, wait: 2 }, { x: 10, y: 25, wait: 2 }, { x: 8, y: 37, action: 'pond', wait: 60 }] },
        { hour: 17, wps: [{ x: 10, y: 20, wait: 2 }, { x: 24, y: 19, wait: 2 }, { x: 24, y: 10, wait: 100 }] },
        { hour: 19, wps: [{ x: 24, y: 10, action: 'sleep', wait: 600 }] },
      ];
      let rIdx = 0, wIdx = 0, waiting = false;
      const getRoutine = () => { let best = routines[0]; for (const r of routines) if (gameTime >= r.hour) best = r; return best; };

      // Animals
      interface Animal { x: number; y: number; tx: number; ty: number; type: string; img: HTMLImageElement; v: number; dir: number; frame: number; ft: number; st: number; moving: boolean; cols: number; }
      const animalBounds = { x1: 37, x2: 44, y1: 23, y2: 31 };
      const animals: Animal[] = [
        { x: 39, y: 25, tx: 39, ty: 25, type: 'chicken', img: chickenRImg, v: 0, dir: 0, frame: 0, ft: 0, st: 2, moving: false, cols: 4 },
        { x: 41, y: 27, tx: 41, ty: 27, type: 'chicken', img: chickenBImg, v: 1, dir: 1, frame: 0, ft: 0, st: 3, moving: false, cols: 4 },
        { x: 43, y: 24, tx: 43, ty: 24, type: 'chicken', img: chickenYImg, v: 2, dir: 0, frame: 0, ft: 0, st: 1, moving: false, cols: 4 },
        { x: 39, y: 29, tx: 39, ty: 29, type: 'cow', img: cowMImg, v: 0, dir: 0, frame: 0, ft: 0, st: 4, moving: false, cols: 8 },
        { x: 42, y: 27, tx: 42, ty: 27, type: 'cow', img: cowFImg, v: 1, dir: 1, frame: 0, ft: 0, st: 2, moving: false, cols: 8 },
      ];

      // Stars
      const starRng = mkRng(999);
      const stars = Array.from({ length: 100 }, () => ({
        x: starRng() * MW * ST, y: starRng() * MH * ST,
        b: 0.3 + starRng() * 0.7, sp: 1 + starRng() * 3,
      }));

      // Particles
      interface Ptc { x: number; y: number; vx: number; vy: number; life: number; max: number; type: string; color: string; sz: number; ph: number; }
      const ptcs: Ptc[] = [];
      const ptcRng = mkRng(123);

      // Crops state
      const cropStages: Map<string, number> = new Map();

      // ── DRAWING HELPERS ──

      // Draw a tile from tileset
      function drawTile(tileIdx: number, px: number, py: number) {
        if (!tileset || !tileset.width) return;
        const col = tileIdx % TS_COLS;
        const row = (tileIdx / TS_COLS) | 0;
        ctx.drawImage(tileset, col * T, row * T, T, T, px, py, ST, ST);
      }

      // Draw a character sprite from a sheet
      function drawCharSprite(sheet: HTMLImageElement, dir: number, frame: number, cols: number, maxFrames: number, px: number, py: number) {
        if (!sheet || !sheet.width) return false;
        const f = frame % maxFrames;
        const d = dir % 4;
        const idx = d * cols + f;
        const sc = idx % cols;
        const sr = (idx / cols) | 0;
        const sw = Math.floor(sheet.width / cols);
        const sh = Math.floor(sheet.height / Math.ceil((4 * cols) / cols));
        const actualSh = Math.floor(sheet.height / 4); // 4 direction rows
        ctx.drawImage(sheet, sc * T, d * actualSh, T, actualSh, px, py, ST, actualSh * S);
        return true;
      }

      // Draw farmer from walk/idle sheet
      function drawFarmerSprite(px: number, py: number) {
        const sheet = farmer.moving ? walkImg : idleImg;
        if (!sheet || !sheet.width) return false;
        const cols = farmer.moving ? 12 : 8;
        const maxFrames = farmer.moving ? 3 : 2;
        const f = farmer.frame % maxFrames;
        const d = farmer.dir % 4;
        const idx = d * cols + f;
        const srcCol = idx % cols;
        const srcRow = (idx / cols) | 0;
        const sheetW = sheet.width;
        const rows = Math.floor(sheet.height / T);
        const actualSrcRow = Math.min(srcRow, rows - 1);
        ctx.drawImage(sheet, srcCol * T, actualSrcRow * T, T, T, px, py, ST, ST);
        return true;
      }

      // Draw animal from its sprite sheet
      function drawAnimalSprite(a: Animal, px: number, py: number) {
        if (!a.img || !a.img.width) return false;
        const cols = a.cols;
        const maxFrames = 2;
        const f = a.frame % maxFrames;
        const d = a.dir % 4;
        const idx = d * cols + f;
        const srcCol = idx % cols;
        const srcRow = (idx / cols) | 0;
        const sheetRows = Math.floor(a.img.height / T);
        const actualSrcRow = Math.min(srcRow, sheetRows - 1);
        const srcX = srcCol * T;
        const srcY = actualSrcRow * T;
        ctx.drawImage(a.img, srcX, srcY, T, T, px, py, ST, ST);
        return true;
      }

      // ── UPDATE ──
      function moveToward(e: { x: number; y: number; tx: number; ty: number; dir: number; frame: number; ft: number; moving: boolean }, spd: number, dt: number) {
        if (!e.moving) return;
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.15) { e.x = e.tx; e.y = e.ty; e.moving = false; return; }
        const ms = spd * dt;
        e.x += (dx / d) * ms;
        e.y += (dy / d) * ms;
        e.dir = Math.abs(dx) > Math.abs(dy) * 0.5 ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
        e.ft += dt;
        if (e.ft > 0.15) { e.ft -= 0.15; e.frame = (e.frame + 1) % 4; }
      }

      function updateFarmer(dt: number) {
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
        if (farmer.moving && ptcRng() < 0.08) {
          ptcs.push({ x: farmer.x + (ptcRng() - 0.5), y: farmer.y + 0.5, vx: (ptcRng() - 0.5) * 0.3, vy: -0.2 - ptcRng() * 0.2, life: 0, max: 0.4 + ptcRng() * 0.3, type: 'dust', color: '#c9a96e', sz: 1 + ptcRng(), ph: 0 });
        }
      }

      function updateAnimal(a: Animal, dt: number) {
        a.st -= dt;
        if (!a.moving) {
          if (a.st <= 0) {
            if (ptcRng() < 0.6) {
              a.tx = animalBounds.x1 + 1 + ptcRng() * (animalBounds.x2 - animalBounds.x1 - 2);
              a.ty = animalBounds.y1 + 1 + ptcRng() * (animalBounds.y2 - animalBounds.y1 - 2);
              a.moving = true;
              a.st = 3 + ptcRng() * 5;
            } else { a.st = 2 + ptcRng() * 4; }
          }
          a.ft += dt;
          if (a.ft > 0.6) { a.ft -= 0.6; a.frame = (a.frame + 1) % 2; }
        } else {
          moveToward(a, a.type === 'cow' ? 0.6 : 1.2, dt);
          if (!a.moving) a.st = 1 + ptcRng() * 3;
        }
      }

      function updateParticles(dt: number, t: number) {
        const hour = gameTime % 24;
        const isDay = hour >= 6 && hour < 19;
        if (isDay) {
          if (ptcRng() < 0.012) ptcs.push({ x: camX / ST + ptcRng() * canvas.width / ST, y: camY / ST + ptcRng() * canvas.height / ST, vx: (ptcRng() - 0.5) * 0.6, vy: (ptcRng() - 0.5) * 0.3, life: 0, max: 8 + ptcRng() * 10, type: 'butterfly', color: ['#f9a8d4', '#fbbf24', '#a78bfa', '#34d399'][ptcRng() * 4 | 0], sz: 2 + ptcRng() * 2, ph: ptcRng() * 6.28 });
          if (ptcRng() < 0.006) ptcs.push({ x: camX / ST + ptcRng() * canvas.width / ST, y: camY / ST + ptcRng() * canvas.height / ST, vx: 0.3 + ptcRng() * 0.5, vy: 0.1 + ptcRng() * 0.2, life: 0, max: 5 + ptcRng() * 8, type: 'seed', color: '#fef3c7', sz: 1 + ptcRng(), ph: ptcRng() * 6.28 });
        } else {
          if (ptcRng() < 0.025) ptcs.push({ x: camX / ST + ptcRng() * canvas.width / ST, y: camY / ST + ptcRng() * canvas.height / ST, vx: (ptcRng() - 0.5) * 0.2, vy: (ptcRng() - 0.5) * 0.2, life: 0, max: 3 + ptcRng() * 5, type: 'firefly', color: '#fde047', sz: 2 + ptcRng() * 2, ph: ptcRng() * 6.28 });
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

        // ── Sky color based on time ──
        const hour = gameTime % 24;
        let skyR = 135, skyG = 206, skyB = 235; // day sky
        if (hour >= 5 && hour < 7) {
          const f = (hour - 5) / 2;
          skyR = 40 + f * 95; skyG = 30 + f * 176; skyB = 80 + f * 155;
        } else if (hour >= 17 && hour < 19) {
          const f = (hour - 17) / 2;
          skyR = 135 + f * 80; skyG = 206 - f * 100; skyB = 235 - f * 100;
        } else if (hour >= 19 && hour < 20) {
          const f = hour - 19;
          skyR = 215 - f * 195; skyG = 106 - f * 86; skyB = 135 - f * 95;
        } else if (hour >= 20 || hour < 5) {
          skyR = 20; skyG = 20; skyB = 40;
        }
        ctx.fillStyle = `rgb(${skyR | 0},${skyG | 0},${skyB | 0})`;
        ctx.fillRect(0, 0, w, h);

        // ── Ground tiles (using tileset sprites) ──
        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            const px = x * ST - camX;
            const py = y * ST - camY;
            const terrain = map[y][x];

            if (terrain === 5) {
              // Water: animated color + tileset tile
              const wp = Math.floor(t * 1.5) % 4;
              const wb = wp === 0 ? 10 : wp === 1 ? 0 : wp === 2 ? -10 : 0;
              ctx.fillStyle = `rgb(${74 + wb | 0},${144 + wb | 0},${217 + wb | 0})`;
              ctx.fillRect(px, py, ST + 1, ST + 1);
              // Overlay with tileset water tile
              drawTile(tiles[y][x], px, py);
            } else {
              // All other terrain: draw tileset tile directly
              drawTile(tiles[y][x], px, py);
            }
          }
        }

        // ── Farmland row lines ──
        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            if (map[y][x] !== 2) continue;
            const px = x * ST - camX;
            const py = y * ST - camY;
            ctx.fillStyle = 'rgba(80,50,10,0.3)';
            ctx.fillRect(px, py + ST / 2 - 1, ST + 1, 2);
          }
        }

        // ── Water shimmer ──
        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            if (map[y][x] !== 5) continue;
            const px = x * ST - camX;
            const py = y * ST - camY;
            const sh = Math.sin(t * 3 + x * 2 + y * 1.5) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(200,230,255,${sh * 0.25})`;
            ctx.fillRect(px, py, ST, ST);
          }
        }

        // ── Collect Y-sorted drawables ──
        interface Draw { sortY: number; fn: () => void; }
        const draws: Draw[] = [];

        // -- House (224x112 = 14x7 tiles, placed at top center) --
        if (houseImg && houseImg.width) {
          draws.push({
            sortY: 9,
            fn: () => {
              const px = 18 * ST - camX;
              const py = 3 * ST - camY;
              // House shadow
              ctx.fillStyle = 'rgba(0,0,0,0.15)';
              ctx.beginPath();
              ctx.ellipse(px + houseImg.width * S / 2, py + houseImg.height * S - 10, houseImg.width * S * 0.4, 12, 0, 0, 6.28);
              ctx.fill();
              ctx.drawImage(houseImg, 0, 0, houseImg.width, houseImg.height, px, py, houseImg.width * S, houseImg.height * S);
            },
          });
        }

        // -- Fences using fence sprite --
        const drawFenceSprite = (x: number, y: number, col: number, row: number) => {
          draws.push({
            sortY: y + 0.7,
            fn: () => {
              const px = x * ST - camX;
              const py = y * ST - camY;
              if (fenceImg && fenceImg.width) {
                ctx.drawImage(fenceImg, col * T, row * T, T, T, px, py, ST, ST);
              } else {
                // Fallback
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(px + 2, py + 6, ST - 4, ST - 6);
                ctx.fillStyle = '#6b5540';
                ctx.fillRect(px + 4, py + 2, 4, ST - 2);
                ctx.fillRect(px + ST - 8, py + 2, 4, ST - 2);
              }
            },
          });
        };

        // Farm fences (west side)
        for (let x = 4; x <= 18; x++) { drawFenceSprite(x, 22, 1, 0); drawFenceSprite(x, 33, 1, 2); }
        for (let y = 22; y <= 33; y++) { drawFenceSprite(4, y, 0, 1); drawFenceSprite(18, y, 2, 1); }
        // Gate gaps in farm fence
        // (path goes through at x=11, y=22 and x=11, y=33 - those tiles are paths so fences skip them)

        // Animal fences (east side)
        for (let x = 36; x <= 45; x++) { drawFenceSprite(x, 22, 1, 0); drawFenceSprite(x, 32, 1, 2); }
        for (let y = 22; y <= 32; y++) { drawFenceSprite(36, y, 0, 1); drawFenceSprite(45, y, 2, 1); }

        // -- Trees using Maple Tree sprite --
        for (const obj of objects) {
          if (obj.type !== 'tree') continue;
          draws.push({
            sortY: obj.sortY,
            fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              if (treeImg && treeImg.width) {
                // Each tree is 32x48 (2x3 tiles), 5 variants across 160px width
                const tv = obj.v % 5;
                const srcX = tv * 32;
                ctx.drawImage(treeImg, srcX, 0, 32, 48, px - ST * 0.5, py - ST * 1.5, 32 * S, 48 * S);
              } else {
                // Fallback
                const sway = Math.sin(t * 0.8 + obj.x * 2 + obj.y) * 1.5;
                ctx.fillStyle = '#6b4226';
                ctx.fillRect(px + ST * 0.4, py + ST * 0.5, ST * 0.2, ST * 1.2);
                ctx.fillStyle = obj.v % 2 === 0 ? '#2d8a2d' : '#3aa03a';
                ctx.beginPath();
                ctx.arc(px + ST * 0.5 + sway, py, ST * 0.7, 0, Math.PI * 2);
                ctx.fill();
              }
            },
          });
        }

        // -- Crops using crop sprite --
        if (cropImg && cropImg.width) {
          for (let cy = 23; cy <= 32; cy++) {
            for (let cx = 5; cx <= 17; cx++) {
              if (map[cy]?.[cx] !== 2) continue;
              // Skip path gaps
              if ((cx === 11 || cx === 12) && cy >= 24 && cy <= 31) continue;
              const key = `${cx},${cy}`;
              let stage = cropStages.get(key) || 0;
              stage = Math.min(stage, 4);
              draws.push({
                sortY: cy + 0.5,
                fn: () => {
                  const px = cx * ST - camX;
                  const py = cy * ST - camY;
                  // Spring Crops: 224x128 = 14 cols x 8 rows
                  // 4 crop types (rows 0-3), stages across columns (0,3,6,9,12)
                  const typeRow = (cx + cy) % 4;
                  const stageCol = [0, 3, 6, 9, 12][Math.floor(stage)];
                  ctx.drawImage(cropImg, stageCol * T, typeRow * T, T, T, px, py, ST, ST);
                },
              });
            }
          }
        }

        // -- Flowers --
        for (const obj of objects) {
          if (obj.type !== 'flower') continue;
          const flowerColors = ['#e04040', '#e0d040', '#d060d0', '#60a0e0'];
          draws.push({
            sortY: obj.sortY,
            fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              // Stem
              ctx.fillStyle = '#40a030';
              ctx.fillRect(px + 7 * S, py + 9 * S, 2 * S, 5 * S);
              // Petals
              ctx.fillStyle = flowerColors[obj.v % 4];
              ctx.fillRect(px + 5 * S, py + 6 * S, 6 * S, 4 * S);
              // Center
              ctx.fillStyle = '#f0f060';
              ctx.fillRect(px + 7 * S, py + 7 * S, 2 * S, 2 * S);
            },
          });
        }

        // -- Rocks --
        for (const obj of objects) {
          if (obj.type !== 'rock') continue;
          draws.push({
            sortY: obj.sortY,
            fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              const shade = obj.v === 0 ? '#888' : obj.v === 1 ? '#777' : '#999';
              const hi = obj.v === 0 ? '#aaa' : obj.v === 1 ? '#999' : '#bbb';
              ctx.fillStyle = shade;
              ctx.fillRect(px + 3 * S, py + 7 * S, 10 * S, 7 * S);
              ctx.fillRect(px + 5 * S, py + 5 * S, 6 * S, 2 * S);
              ctx.fillStyle = hi;
              ctx.fillRect(px + 4 * S, py + 7 * S, 4 * S, 3 * S);
            },
          });
        }

        // -- Chest --
        for (const obj of objects) {
          if (obj.type !== 'chest') continue;
          draws.push({
            sortY: obj.sortY,
            fn: () => {
              const px = obj.x * ST - camX;
              const py = obj.y * ST - camY;
              if (chestImg && chestImg.width) {
                ctx.drawImage(chestImg, 0, 0, chestImg.width, chestImg.height, px, py, chestImg.width * S, chestImg.height * S);
              } else {
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(px + 2 * S, py + 4 * S, 12 * S, 8 * S);
                ctx.fillStyle = '#c49a6c';
                ctx.fillRect(px + 2 * S, py + 4 * S, 12 * S, 2 * S);
                ctx.fillStyle = '#f0c040';
                ctx.fillRect(px + 7 * S, py + 6 * S, 2 * S, 2 * S);
              }
            },
          });
        }

        // -- Animals using their sprite sheets --
        for (const a of animals) {
          draws.push({
            sortY: a.y + 0.8,
            fn: () => {
              const px = a.x * ST - camX;
              const py = a.y * ST - camY;
              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              if (a.type === 'cow') {
                ctx.beginPath();
                ctx.ellipse(px + ST * 0.5, py + ST * 1.6, ST * 0.5, ST * 0.12, 0, 0, 6.28);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.ellipse(px + ST * 0.5, py + ST * 0.8, ST * 0.25, ST * 0.08, 0, 0, 6.28);
                ctx.fill();
              }
              // Draw sprite
              if (!drawAnimalSprite(a, px, py)) {
                // Fallback if sprite fails
                if (a.type === 'cow') {
                  ctx.fillStyle = '#8B6340';
                  ctx.fillRect(px + 2 * S, py + 4 * S, 12 * S, 8 * S);
                  ctx.fillStyle = '#fff';
                  ctx.fillRect(px + 10 * S, py + 6 * S, 3 * S, 2 * S);
                } else {
                  ctx.fillStyle = '#e04040';
                  ctx.fillRect(px + 4 * S, py + 6 * S, 8 * S, 6 * S);
                  ctx.fillStyle = '#e0a020';
                  ctx.fillRect(px + 10 * S, py + 7 * S, 2 * S, 2 * S);
                }
              }
            },
          });
        }

        // -- Farmer --
        draws.push({
          sortY: farmer.y + 0.8,
          fn: () => {
            const px = farmer.x * ST - camX;
            const py = farmer.y * ST - camY;
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(px + ST * 0.5, py + ST * 1.8, ST * 0.35, ST * 0.1, 0, 0, 6.28);
            ctx.fill();
            if (!drawFarmerSprite(px, py)) {
              // Fallback farmer
              ctx.fillStyle = '#604020';
              ctx.fillRect(px + 4 * S, py + 10 * S, 8 * S, 6 * S);
              ctx.fillStyle = '#4060c0';
              ctx.fillRect(px + 3 * S, py + 5 * S, 10 * S, 6 * S);
              ctx.fillStyle = '#f0c090';
              ctx.fillRect(px + 5 * S, py + 1 * S, 6 * S, 5 * S);
              ctx.fillStyle = '#2a2a2a';
              ctx.fillRect(px + 6 * S, py + 3 * S, S, S);
              ctx.fillRect(px + 9 * S, py + 3 * S, S, S);
              ctx.fillStyle = '#6b3a1a';
              ctx.fillRect(px + 5 * S, py, 6 * S, 2 * S);
            }
          },
        });

        // Sort and draw all objects
        draws.sort((a, b) => a.sortY - b.sortY);
        for (const d of draws) d.fn();

        // ── Day/Night overlay ──
        let overlayAlpha = 0;
        if (hour >= 5 && hour < 7) {
          overlayAlpha = 0.2 * (1 - (hour - 5) / 2);
        } else if (hour >= 17 && hour < 19) {
          overlayAlpha = 0.15 * ((hour - 17) / 2);
        } else if (hour >= 19 && hour < 20) {
          overlayAlpha = 0.4 * (hour - 19);
        } else if (hour >= 20 || hour < 5) {
          overlayAlpha = 0.4;
        }
        if (overlayAlpha > 0) {
          ctx.fillStyle = hour >= 19 ? `rgba(10,10,50,${overlayAlpha.toFixed(3)})` : `rgba(255,180,80,${overlayAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, w, h);
        }

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
            ctx.fillStyle = p.color;
            ctx.globalAlpha = al;
            ctx.fillRect(px - wf - p.sz, py - p.sz * 0.5, p.sz, p.sz);
            ctx.fillRect(px + wf, py - p.sz * 0.5, p.sz, p.sz);
            ctx.globalAlpha = 1;
          } else if (p.type === 'firefly') {
            const gl = 0.5 + 0.5 * Math.sin(t * 5 + p.ph);
            const r = p.sz * (0.8 + gl * 0.4);
            ctx.fillStyle = `rgba(253,224,71,${al * gl * 0.8})`;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, 6.28);
            ctx.fill();
            ctx.fillStyle = `rgba(253,224,71,${al * gl * 0.2})`;
            ctx.beginPath();
            ctx.arc(px, py, r * 2.5, 0, 6.28);
            ctx.fill();
          } else if (p.type === 'seed') {
            ctx.fillStyle = `rgba(254,243,199,${al * 0.7})`;
            ctx.fillRect(px, py, p.sz, p.sz);
          } else if (p.type === 'dust') {
            ctx.fillStyle = `rgba(196,167,106,${al * 0.5})`;
            ctx.fillRect(px, py, p.sz, p.sz);
          }
        }

        // ── UI ──
        drawUI(w, h);
      }

      function drawUI(w: number, h: number) {
        const hour = gameTime % 24;
        const h12 = hour % 12 || 12;
        const mm = Math.floor((hour % 1) * 60);
        const ampm = hour < 12 ? 'AM' : 'PM';
        const timeStr = `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;

        // Panel background
        const pw = 160, ph = 80, px = w - pw - 16, py = 16;
        ctx.fillStyle = 'rgba(20,15,10,0.75)';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,150,100,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Sun/moon icon
        const ix = px + 22, iy = py + 22;
        if (hour >= 6 && hour < 19) {
          // Sun
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(ix, iy, 7, 0, 6.28);
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          const gt = performance.now() / 1000;
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * 6.28 + gt * 0.3;
            ctx.beginPath();
            ctx.moveTo(ix + Math.cos(ang) * 9, iy + Math.sin(ang) * 9);
            ctx.lineTo(ix + Math.cos(ang) * 12, iy + Math.sin(ang) * 12);
            ctx.stroke();
          }
        } else {
          // Moon
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(ix, iy, 7, 0, 6.28);
          ctx.fill();
          ctx.fillStyle = 'rgba(20,15,10,0.85)';
          ctx.beginPath();
          ctx.arc(ix + 2, iy - 1, 6, 0, 6.28);
          ctx.fill();
        }

        // Time text
        ctx.fillStyle = '#e8d5b7';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(timeStr, px + 36, py + 26);

        // Day + Season
        ctx.fillStyle = '#a89070';
        ctx.font = '12px monospace';
        ctx.fillText(`Day ${dayCount}`, px + 14, py + 48);

        ctx.fillStyle = '#7cba5c';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('Spring', px + 80, py + 48);

        // Activity text
        const stateText = farmer.state === 'farm' ? 'Tending crops' : farmer.state === 'animals' ? 'Checking animals' : farmer.state === 'pond' ? 'Admiring pond' : farmer.state === 'sleep' ? 'Sleeping...' : farmer.moving ? 'Walking...' : 'Idle';
        ctx.fillStyle = 'rgba(168,144,112,0.7)';
        ctx.font = '10px monospace';
        ctx.fillText(stateText, px + 14, py + 68);

        // ── Mini-map ──
        const mmSize = 6; // mini-map tile size
        const mmW = MW * mmSize;
        const mmH = MH * mmSize;
        const mmX = 16, mmY = h - mmH - 16;

        ctx.fillStyle = 'rgba(20,15,10,0.6)';
        ctx.beginPath();
        ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 4);
        ctx.fill();

        const terrainColors: Record<number, string> = {
          0: '#4a8c3f', 1: '#c49a6c', 2: '#8B6914', 4: '#d4b896', 5: '#4a90d9',
        };

        for (let y = 0; y < MH; y++) {
          for (let x = 0; x < MW; x++) {
            ctx.fillStyle = terrainColors[map[y][x]] || '#4a8c3f';
            ctx.fillRect(mmX + x * mmSize, mmY + y * mmSize, mmSize, mmSize);
          }
        }

        // Camera view rectangle
        const cvx = mmX + (camX / ST) * mmSize;
        const cvy = mmY + (camY / ST) * mmSize;
        const cvw = (canvas.width / ST) * mmSize;
        const cvh = (canvas.height / ST) * mmSize;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cvx, cvy, cvw, cvh);

        // Farmer dot on mini-map
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(mmX + farmer.x * mmSize - 1, mmY + farmer.y * mmSize - 1, 3, 3);
      }

      // ── GAME LOOP ──
      let last = performance.now();

      function loop(ts: number) {
        if (!running) return;
        const dt = Math.min((ts - last) / 1000, 0.1);
        last = ts;

        // Update time
        gameTime += (24 / DAY_SEC) * dt;
        if (gameTime >= 24) {
          gameTime -= 24;
          dayCount++;
          cropStages.clear();
        }

        // Grow crops slowly
        for (let cy = 23; cy <= 32; cy++)
          for (let cx = 5; cx <= 17; cx++) {
            if (map[cy]?.[cx] !== 2) continue;
            const key = `${cx},${cy}`;
            let st = cropStages.get(key) || 0;
            if (st < 4) {
              st += dt * 0.012;
              const newFloor = Math.floor(st);
              if (newFloor > Math.floor(cropStages.get(key) || 0)) {
                cropStages.set(key, newFloor);
              }
            }
            cropStages.set(key, Math.min(st, 4));
          }

        // Update entities
        updateFarmer(dt);
        for (const a of animals) updateAnimal(a, dt);
        updateParticles(dt, ts / 1000);

        // Camera: smooth follow farmer
        const tx = farmer.x * ST - canvas.width / 2 + ST / 2;
        const ty = farmer.y * ST - canvas.height / 2 + ST / 2;
        const lf = 1 - Math.pow(0.015, dt);
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