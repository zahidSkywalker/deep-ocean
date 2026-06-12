'use client';

import { useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const TILE = 16;
const SCALE = 3;
const SCALED = TILE * SCALE; // 48px
const MAP_W = 50;
const MAP_H = 45;
const DAY_SECONDS = 180; // 3 real minutes = 1 game day

// Tile indices — Spring Tileset (12 cols × 20 rows = 240 tiles)
// Row 0 (0-11): Grass base variants
// Row 1 (12-23): Grass with detail/flowers
// Row 2 (24-35): Dirt/soil
// Row 3 (36-47): Path/road tiles
// Row 4 (48-59): Tilled farmland
// Row 5 (60-71): Water
// Row 6 (72-83): Water edges/transitions
// Row 7-8 (84-107): Grass-dirt/grass-water transitions
// Row 9-11 (108-143): Structural (fences, walls in tileset)
// Row 12-19 (144-239): Decorative, objects, misc
const T_GRASS = [0, 1, 2, 3, 4, 5];
const T_GRASS_DETAIL = [12, 13, 14, 15];
const T_DIRT = [24, 25, 26, 27];
const T_PATH = [36, 37, 38, 39];
const T_FARMLAND = [48, 49, 50, 51];
const T_WATER = [60, 61, 62, 63];
// Water edge tiles from row 6 (72-83)
const T_TALL_GRASS = [180, 181, 182];
const T_FLOWER = [156, 157, 158, 159, 160];
const T_ROCK = [168, 169, 170];

// Directions: 0=down, 1=left, 2=right, 3=up
const DIR_DOWN = 0;
const DIR_LEFT = 1;
const DIR_RIGHT = 2;
const DIR_UP = 3;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface SpriteCache {
  tileset: HTMLImageElement;
  idle: HTMLImageElement;
  walk: HTMLImageElement;
  babyChicken: HTMLImageElement;
  chickenBlonde: HTMLImageElement;
  chickenRed: HTMLImageElement;
  femaleCow: HTMLImageElement;
  maleCow: HTMLImageElement;
  house: HTMLImageElement;
  mapleTree: HTMLImageElement;
  springCrops: HTMLImageElement;
  fence: HTMLImageElement;
  road: HTMLImageElement;
  chest: HTMLImageElement;
}

interface Camera {
  x: number;
  y: number;
}

interface Entity {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: number;
  frame: number;
  frameTimer: number;
  moving: boolean;
  speed: number;
  state: string;
  stateTimer: number;
}

interface CropTile {
  x: number;
  y: number;
  type: number; // crop type row (0-3)
  stage: number; // growth stage (0-4)
  progress: number; // 0-1 progress within stage
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'butterfly' | 'seed' | 'firefly' | 'dust';
  color: string;
  size: number;
  phase: number;
}

interface MapObject {
  type: 'tree' | 'fence_h' | 'fence_v' | 'fence_corner_tl' | 'fence_corner_tr'
       | 'fence_corner_bl' | 'fence_corner_br' | 'flower_dec' | 'rock_dec'
       | 'tall_grass' | 'chest';
  x: number;
  y: number;
  variant: number;
  sortY: number;
}

// ═══════════════════════════════════════════════════════════════
// SEEDED RANDOM (for consistent map generation)
// ═══════════════════════════════════════════════════════════════
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

// ═══════════════════════════════════════════════════════════════
// MAP GENERATION
// ═══════════════════════════════════════════════════════════════
function generateTilemap(): number[][] {
  const map: number[][] = [];

  // Fill with grass variants
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rand();
      if (r < 0.35) map[y][x] = T_GRASS[0];
      else if (r < 0.60) map[y][x] = T_GRASS[1];
      else if (r < 0.80) map[y][x] = T_GRASS[2];
      else if (r < 0.92) map[y][x] = T_GRASS[3];
      else map[y][x] = T_GRASS[4];
    }
  }

  // Scatter grass detail tiles (flowers in grass)
  for (let y = 2; y < MAP_H - 2; y++) {
    for (let x = 2; x < MAP_W - 2; x++) {
      if (rand() < 0.06) {
        map[y][x] = T_GRASS_DETAIL[Math.floor(rand() * T_GRASS_DETAIL.length)];
      }
    }
  }

  // ── PATHS ──
  function setPath(x: number, y: number) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      const variant = T_PATH[(x + y) % T_PATH.length];
      map[y][x] = variant;
    }
  }

  // Main vertical path: from house southward
  for (let y = 11; y <= 38; y++) setPath(24, y);

  // West branch to farm area
  for (let x = 8; x <= 24; x++) setPath(x, 18);

  // East branch to animal area
  for (let x = 24; x <= 38; x++) setPath(x, 18);

  // Path from farm gate to farm interior
  for (let y = 18; y <= 22; y++) setPath(14, y);

  // Path to pond
  for (let y = 18; y <= 30; y++) setPath(12, y);

  // Path from house to main path
  for (let y = 11; y <= 12; y++) {
    for (let x = 22; x <= 26; x++) setPath(x, y);
  }

  // Small path to animal area
  for (let y = 18; y <= 22; y++) setPath(36, y);

  // ── FARMLAND ──
  for (let y = 20; y <= 27; y++) {
    for (let x = 8; x <= 19; x++) {
      // Leave a path row
      if (y === 23 && x >= 8 && x <= 19) continue;
      map[y][x] = T_FARMLAND[(x + y) % T_FARMLAND.length];
    }
  }

  // ── POND ── (elliptical, centered around 12, 34)
  for (let y = 30; y <= 38; y++) {
    for (let x = 6; x <= 18; x++) {
      const cx = 12, cy = 34;
      const dx = (x - cx) / 6;
      const dy = (y - cy) / 4.5;
      if (dx * dx + dy * dy <= 1) {
        map[y][x] = T_WATER[(x + y * 3) % T_WATER.length];
      }
    }
  }

  // Water edges (sandy border around pond)
  for (let y = 29; y <= 39; y++) {
    for (let x = 5; x <= 19; x++) {
      if (map[y][x] >= T_WATER[0] && map[y][x] <= T_WATER[T_WATER.length - 1]) continue;
      // Check if adjacent to water
      let adjWater = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) {
            if (map[ny][nx] >= T_WATER[0] && map[ny][nx] <= T_WATER[T_WATER.length - 1]) {
              adjWater = true;
            }
          }
        }
      }
      if (adjWater && map[y][x] < T_WATER[0]) {
        map[y][x] = T_DIRT[2]; // sandy dirt near water
      }
    }
  }

  // ── SCATTER DECORATIVE TILES ──
  // Flowers in meadow areas
  for (let y = 2; y < MAP_H - 2; y++) {
    for (let x = 2; x < MAP_W - 2; x++) {
      if (map[y][x] >= T_GRASS[0] && map[y][x] <= T_GRASS[T_GRASS.length - 1]) {
        if (rand() < 0.02) {
          map[y][x] = T_FLOWER[Math.floor(rand() * T_FLOWER.length)];
        }
        if (rand() < 0.008) {
          map[y][x] = T_ROCK[Math.floor(rand() * T_ROCK.length)];
        }
      }
    }
  }

  // Tall grass patches
  const tallGrassSpots = [
    [3, 3], [4, 5], [6, 3], [40, 4], [42, 6], [44, 3],
    [3, 40], [5, 42], [42, 40], [44, 38], [46, 41],
    [35, 35], [37, 37], [30, 5], [45, 15], [4, 20],
  ];
  for (const [tx, ty] of tallGrassSpots) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const ny = ty + dy, nx = tx + dx;
        if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) {
          if (map[ny][nx] >= T_GRASS[0] && map[ny][nx] <= T_GRASS[T_GRASS.length - 1]) {
            map[ny][nx] = T_TALL_GRASS[Math.floor(rand() * T_TALL_GRASS.length)];
          }
        }
      }
    }
  }

  return map;
}

// ═══════════════════════════════════════════════════════════════
// OBJECT GENERATION
// ═══════════════════════════════════════════════════════════════
function generateObjects(): MapObject[] {
  const objects: MapObject[] = [];

  // ── TREES ──
  // Dense border (2 tiles thick)
  function addTree(x: number, y: number) {
    objects.push({
      type: 'tree',
      x, y,
      variant: Math.floor(rand() * 5),
      sortY: y + 2,
    });
  }

  // Top border
  for (let x = 2; x < MAP_W - 2; x++) {
    if (rand() < 0.7) addTree(x, 0);
    if (rand() < 0.5) addTree(x, 1);
  }
  // Bottom border
  for (let x = 2; x < MAP_W - 2; x++) {
    if (rand() < 0.5) addTree(x, MAP_H - 2);
    if (rand() < 0.7) addTree(x, MAP_H - 1);
  }
  // Left border
  for (let y = 2; y < MAP_H - 2; y++) {
    if (rand() < 0.7) addTree(0, y);
    if (rand() < 0.5) addTree(1, y);
  }
  // Right border
  for (let y = 2; y < MAP_H - 2; y++) {
    if (rand() < 0.5) addTree(MAP_W - 2, y);
    if (rand() < 0.7) addTree(MAP_W - 1, y);
  }

  // Tree clusters
  const treeClusters: [number, number, number, number][] = [
    [3, 2, 6, 4],      // NW grove
    [42, 2, 7, 4],     // NE grove
    [3, 38, 5, 5],     // SW grove
    [40, 35, 8, 7],    // SE forest
    [28, 30, 4, 3],    // South small grove
    [42, 25, 4, 3],    // East small grove
  ];

  for (const [cx, cy, w, h] of treeClusters) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (rand() < 0.6) {
          addTree(cx + dx, cy + dy);
        }
      }
    }
  }

  // Scattered individual trees
  const scatteredTrees = [
    [8, 10], [16, 4], [35, 8], [45, 12], [6, 15],
    [44, 18], [3, 28], [20, 35], [35, 30], [25, 42],
    [15, 14], [38, 10], [46, 22], [4, 34], [30, 40],
    [22, 3], [33, 4], [48, 30], [2, 14], [47, 10],
  ];
  for (const [x, y] of scatteredTrees) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      addTree(x, y);
    }
  }

  // ── FENCES — Farm area (cols 7-20, rows 19-28) ──
  const farmMinX = 7, farmMaxX = 20, farmMinY = 19, farmMaxY = 28;
  // Top fence
  for (let x = farmMinX; x <= farmMaxX; x++) {
    if (x === farmMinX) objects.push({ type: 'fence_corner_tl', x, y: farmMinY, variant: 0, sortY: farmMinY });
    else if (x === farmMaxX) objects.push({ type: 'fence_corner_tr', x, y: farmMinY, variant: 0, sortY: farmMinY });
    else objects.push({ type: 'fence_h', x, y: farmMinY, variant: 0, sortY: farmMinY });
  }
  // Bottom fence (with gate at x=14)
  for (let x = farmMinX; x <= farmMaxX; x++) {
    if (x === farmMinX) objects.push({ type: 'fence_corner_bl', x, y: farmMaxY, variant: 0, sortY: farmMaxY });
    else if (x === farmMaxX) objects.push({ type: 'fence_corner_br', x, y: farmMaxY, variant: 0, sortY: farmMaxY });
    else if (x === 13 || x === 14) { /* gate opening */ }
    else objects.push({ type: 'fence_h', x, y: farmMaxY, variant: 1, sortY: farmMaxY });
  }
  // Left fence
  for (let y = farmMinY + 1; y < farmMaxY; y++) {
    objects.push({ type: 'fence_v', x: farmMinX, y, variant: 0, sortY: y });
  }
  // Right fence
  for (let y = farmMinY + 1; y < farmMaxY; y++) {
    objects.push({ type: 'fence_v', x: farmMaxX, y, variant: 1, sortY: y });
  }

  // ── FENCES — Animal area (cols 30-43, rows 19-28) ──
  const animMinX = 30, animMaxX = 43, animMinY = 19, animMaxY = 28;
  for (let x = animMinX; x <= animMaxX; x++) {
    if (x === animMinX) objects.push({ type: 'fence_corner_tl', x, y: animMinY, variant: 1, sortY: animMinY });
    else if (x === animMaxX) objects.push({ type: 'fence_corner_tr', x, y: animMinY, variant: 1, sortY: animMinY });
    else objects.push({ type: 'fence_h', x, y: animMinY, variant: 2, sortY: animMinY });
  }
  for (let x = animMinX; x <= animMaxX; x++) {
    if (x === animMinX) objects.push({ type: 'fence_corner_bl', x, y: animMaxY, variant: 1, sortY: animMaxY });
    else if (x === animMaxX) objects.push({ type: 'fence_corner_br', x, y: animMaxY, variant: 1, sortY: animMaxY });
    else if (x === 35 || x === 36) { /* gate opening */ }
    else objects.push({ type: 'fence_h', x, y: animMaxY, variant: 3, sortY: animMaxY });
  }
  for (let y = animMinY + 1; y < animMaxY; y++) {
    objects.push({ type: 'fence_v', x: animMinX, y, variant: 2, sortY: y });
  }
  for (let y = animMinY + 1; y < animMaxY; y++) {
    objects.push({ type: 'fence_v', x: animMaxX, y, variant: 3, sortY: y });
  }

  // ── DECORATIVE FLOWERS AND ROCKS ──
  const flowerSpots = [
    [21, 13], [22, 14], [27, 13], [26, 15], [20, 16],
    [29, 14], [28, 16], [5, 25], [45, 10], [44, 14],
    [22, 30], [25, 32], [30, 32], [38, 30], [15, 8],
    [35, 12], [40, 8], [10, 10], [48, 15],
  ];
  for (const [x, y] of flowerSpots) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      objects.push({ type: 'flower_dec', x, y, variant: Math.floor(rand() * 4), sortY: y });
    }
  }

  const rockSpots = [
    [22, 3], [16, 12], [38, 14], [5, 30], [45, 20],
    [30, 8], [10, 16], [40, 32], [20, 40], [35, 38],
  ];
  for (const [x, y] of rockSpots) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      objects.push({ type: 'rock_dec', x, y, variant: Math.floor(rand() * 3), sortY: y });
    }
  }

  // Chest near house
  objects.push({ type: 'chest', x: 32, y: 9, variant: 0, sortY: 9 });

  return objects;
}

// ═══════════════════════════════════════════════════════════════
// CROP GENERATION
// ═══════════════════════════════════════════════════════════════
function generateCrops(): CropTile[] {
  const crops: CropTile[] = [];
  // Farm plots: cols 8-19, rows 20-27 (excluding path row 23)
  const cropTypeRows = [0, 1, 2, 3]; // different crop types from Spring Crops

  for (let y = 20; y <= 27; y++) {
    if (y === 23) continue; // path row
    for (let x = 8; x <= 19; x++) {
      // Leave some gaps for walking paths in the farm
      if (x === 14 && (y === 20 || y === 21 || y === 26 || y === 27)) continue;
      if ((x === 8 || x === 19) && y % 2 === 1) continue;
      crops.push({
        x, y,
        type: cropTypeRows[(y + x) % cropTypeRows.length],
        stage: Math.floor(rand() * 3), // start at various stages
        progress: rand() * 0.5,
      });
    }
  }
  return crops;
}

// ═══════════════════════════════════════════════════════════════
// SPRITE LOADING
// ═══════════════════════════════════════════════════════════════
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSprites(): Promise<SpriteCache> {
  const [tileset, idle, walk, babyChicken, chickenBlonde, chickenRed,
         femaleCow, maleCow, house, mapleTree, springCrops, fence, road, chest] =
    await Promise.all([
      loadImage('/assets/tileset/Tileset Spring.png'),
      loadImage('/assets/sprites/Idle.png'),
      loadImage('/assets/sprites/Walk.png'),
      loadImage('/assets/sprites/Baby Chicken Yellow.png'),
      loadImage('/assets/sprites/Chicken Blonde  Green.png'),
      loadImage('/assets/sprites/Chicken Red.png'),
      loadImage('/assets/sprites/Female Cow Brown.png'),
      loadImage('/assets/sprites/Male Cow Brown.png'),
      loadImage('/assets/objects/House.png'),
      loadImage('/assets/objects/Maple Tree.png'),
      loadImage('/assets/objects/Spring Crops.png'),
      loadImage("/assets/objects/Fence's copiar.png"),
      loadImage('/assets/objects/Road copiar.png'),
      loadImage('/assets/objects/chest.png'),
    ]);

  return { tileset, idle, walk, babyChicken, chickenBlonde, chickenRed,
           femaleCow, maleCow, house, mapleTree, springCrops, fence, road, chest };
}

// ═══════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════
function drawTileFromSheet(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  tileIndex: number,
  sheetCols: number,
  destX: number,
  destY: number
) {
  const srcCol = tileIndex % sheetCols;
  const srcRow = Math.floor(tileIndex / sheetCols);
  ctx.drawImage(
    sheet,
    srcCol * TILE, srcRow * TILE, TILE, TILE,
    destX, destY, SCALED, SCALED
  );
}

function drawSpritePortion(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  destX: number,
  destY: number,
  destW: number,
  destH: number
) {
  ctx.drawImage(sheet, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
}

// ═══════════════════════════════════════════════════════════════
// FARMER AI — Waypoint-based daily routine
// ═══════════════════════════════════════════════════════════════
interface Waypoint {
  x: number;
  y: number;
  arriveAction?: string;
  stayTime: number; // seconds to stay at this waypoint
}

const FARMER_WAYPOINTS: { hour: number; waypoints: Waypoint[] }[] = [
  // Dawn: wake up and go to farm
  { hour: 5, waypoints: [
    { x: 24, y: 11, stayTime: 30 },    // step out of house
    { x: 24, y: 15, stayTime: 5 },     // walk to junction
    { x: 14, y: 18, stayTime: 5 },     // arrive at farm gate
    { x: 14, y: 21, arriveAction: 'farm', stayTime: 90 }, // tend crops
  ]},
  // Morning: go check animals
  { hour: 8, waypoints: [
    { x: 14, y: 18, stayTime: 3 },     // leave farm
    { x: 24, y: 18, stayTime: 5 },     // back to junction
    { x: 36, y: 18, stayTime: 5 },     // arrive at animal gate
    { x: 36, y: 22, arriveAction: 'animals', stayTime: 90 }, // check animals
  ]},
  // Mid-morning: wander village
  { hour: 10, waypoints: [
    { x: 36, y: 18, stayTime: 3 },     // leave animals
    { x: 30, y: 15, stayTime: 10 },    // wander
    { x: 28, y: 12, stayTime: 15 },    // near house yard
    { x: 20, y: 14, stayTime: 10 },    // west side
    { x: 24, y: 16, stayTime: 10 },    // back to center
    { x: 28, y: 20, stayTime: 10 },    // east side
    { x: 24, y: 15, stayTime: 10 },    // center again
  ]},
  // Afternoon: go to pond
  { hour: 15, waypoints: [
    { x: 24, y: 18, stayTime: 3 },
    { x: 12, y: 18, stayTime: 5 },
    { x: 10, y: 29, arriveAction: 'pond', stayTime: 60 }, // admire pond
  ]},
  // Late afternoon: return home
  { hour: 17, waypoints: [
    { x: 10, y: 18, stayTime: 3 },
    { x: 24, y: 18, stayTime: 3 },
    { x: 24, y: 11, stayTime: 120 },   // stand near house until dusk
  ]},
  // Night: sleep
  { hour: 19, waypoints: [
    { x: 24, y: 11, arriveAction: 'sleep', stayTime: 600 }, // sleep all night
  ]},
];

function getFarmerRoutine(gameHour: number): { waypoints: Waypoint[] } {
  // Find the current routine based on game hour
  let best = FARMER_WAYPOINTS[0];
  for (const routine of FARMER_WAYPOINTS) {
    if (gameHour >= routine.hour) best = routine;
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function FarmScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let running = true;
    let animFrameId = 0;

    async function init() {
      const sprites = await loadSprites();
      if (!running || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // ── Resize handler ──
      function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      // ── Generate world ──
      const tilemap = generateTilemap();
      const mapObjects = generateObjects();
      const crops = generateCrops();

      // ── Stars (fixed positions) ──
      const stars: { x: number; y: number; brightness: number; twinkleSpeed: number }[] = [];
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: rand() * MAP_W * SCALED,
          y: rand() * MAP_H * SCALED,
          brightness: 0.3 + rand() * 0.7,
          twinkleSpeed: 1 + rand() * 3,
        });
      }

      // ── Camera ──
      const camera: Camera = { x: 0, y: 0 };

      // ── Time system ──
      let gameTime = 6.0; // Start at 6:00 AM
      let dayCount = 1;

      // ── Farmer entity ──
      const farmer: Entity = {
        x: 24, y: 11,
        targetX: 24, targetY: 11,
        direction: DIR_DOWN,
        frame: 0, frameTimer: 0,
        moving: false,
        speed: 2.2,
        state: 'idle',
        stateTimer: 0,
      };
      let currentRoutine = getFarmerRoutine(gameTime);
      let waypointIndex = 0;
      let waitingAtWaypoint = false;

      function advanceFarmerRoutine() {
        waypointIndex++;
        if (waypointIndex >= currentRoutine.waypoints.length) {
          // Stay at last waypoint
          waypointIndex = currentRoutine.waypoints.length - 1;
        }
        waitingAtWaypoint = false;
      }

      function updateFarmerRoutine() {
        const newRoutine = getFarmerRoutine(gameTime);
        if (newRoutine !== currentRoutine) {
          currentRoutine = newRoutine;
          waypointIndex = 0;
          waitingAtWaypoint = false;
        }
      }

      // ── Animal entities ──
      const chickens: Entity[] = [
        { x: 32, y: 22, targetX: 32, targetY: 22, direction: DIR_DOWN, frame: 0, frameTimer: 0, moving: false, speed: 1.5, state: 'wander', stateTimer: rand() * 3 },
        { x: 36, y: 24, targetX: 36, targetY: 24, direction: DIR_LEFT, frame: 0, frameTimer: 0, moving: false, speed: 1.3, state: 'wander', stateTimer: rand() * 3 },
        { x: 39, y: 21, targetX: 39, targetY: 21, direction: DIR_RIGHT, frame: 0, frameTimer: 0, moving: false, speed: 1.4, state: 'idle', stateTimer: rand() * 2 },
      ];

      const cows: Entity[] = [
        { x: 34, y: 25, targetX: 34, targetY: 25, direction: DIR_DOWN, frame: 0, frameTimer: 0, moving: false, speed: 0.6, state: 'wander', stateTimer: rand() * 5 },
        { x: 38, y: 23, targetX: 38, targetY: 23, direction: DIR_LEFT, frame: 0, frameTimer: 0, moving: false, speed: 0.5, state: 'idle', stateTimer: rand() * 4 },
      ];

      // ── Particles ──
      const particles: Particle[] = [];

      function spawnParticle(type: Particle['type']) {
        const p: Particle = {
          x: (camera.x + rand() * canvas.width) / SCALED,
          y: (camera.y + rand() * canvas.height) / SCALED,
          vx: (rand() - 0.5) * 0.5,
          vy: (rand() - 0.5) * 0.3,
          life: 0,
          maxLife: 5 + rand() * 10,
          type,
          color: '#fff',
          size: 1 + rand() * 2,
          phase: rand() * Math.PI * 2,
        };

        if (type === 'butterfly') {
          p.color = ['#f9a8d4', '#fbbf24', '#a78bfa', '#34d399', '#f87171'][Math.floor(rand() * 5)];
          p.size = 2 + rand() * 2;
          p.maxLife = 8 + rand() * 12;
          p.vx = (rand() - 0.5) * 0.8;
          p.vy = (rand() - 0.5) * 0.4;
        } else if (type === 'seed') {
          p.color = '#fef3c7';
          p.size = 1 + rand();
          p.vy = 0.1 + rand() * 0.2;
          p.vx = 0.3 + rand() * 0.5;
        } else if (type === 'firefly') {
          p.color = '#fde047';
          p.size = 2 + rand() * 2;
          p.maxLife = 3 + rand() * 6;
          p.vx = (rand() - 0.5) * 0.3;
          p.vy = (rand() - 0.5) * 0.3;
        } else if (type === 'dust') {
          p.color = '#d4a76a';
          p.size = 1 + rand();
          p.maxLife = 0.5 + rand() * 0.5;
          p.vy = -0.3 - rand() * 0.3;
          p.vx = (rand() - 0.5) * 0.5;
        }

        particles.push(p);
      }

      // ── ANIMAL BOUNDS ──
      const animalBounds = { minX: 31, maxX: 42, minY: 20, maxY: 27 };

      // ── UPDATE FUNCTIONS ──

      function moveEntityToward(e: Entity, dt: number) {
        if (!e.moving) return;

        const dx = e.targetX - e.x;
        const dy = e.targetY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.08) {
          e.x = e.targetX;
          e.y = e.targetY;
          e.moving = false;
          return;
        }

        const moveSpeed = e.speed * dt;
        const mx = (dx / dist) * moveSpeed;
        const my = (dy / dist) * moveSpeed;

        e.x += mx;
        e.y += my;

        // Direction
        if (Math.abs(dx) > Math.abs(dy) * 0.5) {
          e.direction = dx > 0 ? DIR_RIGHT : DIR_LEFT;
        } else {
          e.direction = dy > 0 ? DIR_DOWN : DIR_UP;
        }

        // Animation
        e.frameTimer += dt;
        if (e.frameTimer > 0.15) {
          e.frameTimer -= 0.15;
          e.frame = (e.frame + 1) % 3;
        }
      }

      function updateFarmer(dt: number) {
        updateFarmerRoutine();

        if (waitingAtWaypoint) {
          farmer.stateTimer -= dt;
          if (farmer.stateTimer <= 0) {
            advanceFarmerRoutine();
          }
          // Idle animation
          farmer.frameTimer += dt;
          if (farmer.frameTimer > 0.5) {
            farmer.frameTimer -= 0.5;
            farmer.frame = (farmer.frame + 1) % 2;
          }
          return;
        }

        const wp = currentRoutine.waypoints[Math.min(waypointIndex, currentRoutine.waypoints.length - 1)];
        if (!wp) return;

        if (!farmer.moving) {
          farmer.targetX = wp.x;
          farmer.targetY = wp.y;
          farmer.moving = true;
        }

        moveEntityToward(farmer, dt);

        if (!farmer.moving) {
          // Arrived at waypoint
          if (wp.arriveAction) farmer.state = wp.arriveAction;
          else farmer.state = 'idle';
          waitingAtWaypoint = true;
          farmer.stateTimer = wp.stayTime;
          farmer.direction = DIR_DOWN;
          farmer.frame = 0;
        }

        // Dust particles when walking
        if (farmer.moving && rand() < 0.15) {
          const p: Particle = {
            x: farmer.x + (rand() - 0.5) * 0.5,
            y: farmer.y + 0.3,
            vx: (rand() - 0.5) * 0.3,
            vy: -0.2 - rand() * 0.2,
            life: 0,
            maxLife: 0.4 + rand() * 0.4,
            type: 'dust',
            color: '#c9a96e',
            size: 1 + rand(),
            phase: 0,
          };
          particles.push(p);
        }
      }

      function updateAnimal(e: Entity, bounds: { minX: number; maxX: number; minY: number; maxY: number }, dt: number) {
        e.stateTimer -= dt;

        if (!e.moving) {
          if (e.stateTimer <= 0) {
            // Pick new action
            if (rand() < 0.6) {
              // Wander
              e.state = 'wander';
              e.targetX = bounds.minX + 1 + rand() * (bounds.maxX - bounds.minX - 2);
              e.targetY = bounds.minY + 1 + rand() * (bounds.maxY - bounds.minY - 2);
              e.moving = true;
              e.stateTimer = 3 + rand() * 5;
            } else {
              // Idle/peck
              e.state = 'idle';
              e.stateTimer = 2 + rand() * 4;
            }
          }
          // Idle animation
          e.frameTimer += dt;
          if (e.frameTimer > 0.6) {
            e.frameTimer -= 0.6;
            e.frame = (e.frame + 1) % 2;
          }
        } else {
          moveEntityToward(e, dt);
          if (!e.moving) {
            e.stateTimer = 1 + rand() * 3;
          }
        }
      }

      function updateCrops(dt: number) {
        for (const crop of crops) {
          if (crop.stage < 4) {
            crop.progress += dt * 0.008; // Grow slowly
            if (crop.progress >= 1) {
              crop.progress = 0;
              crop.stage++;
              if (crop.stage > 4) crop.stage = 4;
            }
          }
        }
      }

      function updateParticles(dt: number, time: number) {
        // Spawn particles based on time of day
        const hour = gameTime % 24;
        const isDay = hour >= 6 && hour < 19;

        if (isDay) {
          if (rand() < 0.01) spawnParticle('butterfly');
          if (rand() < 0.008) spawnParticle('seed');
        } else {
          if (rand() < 0.025) spawnParticle('firefly');
        }

        // Update existing particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          if (p.life > p.maxLife) {
            particles.splice(i, 1);
            continue;
          }

          if (p.type === 'butterfly') {
            p.x += p.vx * dt + Math.sin(time * 2 + p.phase) * 0.3 * dt;
            p.y += p.vy * dt + Math.cos(time * 1.5 + p.phase) * 0.2 * dt;
          } else if (p.type === 'seed') {
            p.x += p.vx * dt + Math.sin(time + p.phase) * 0.2 * dt;
            p.y += p.vy * dt;
          } else if (p.type === 'firefly') {
            p.x += p.vx * dt + Math.sin(time * 3 + p.phase) * 0.15 * dt;
            p.y += p.vy * dt + Math.cos(time * 2.5 + p.phase) * 0.1 * dt;
          } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
          }
        }
      }

      function updateCamera(dt: number) {
        const targetX = farmer.x * SCALED - canvas.width / 2;
        const targetY = farmer.y * SCALED - canvas.height / 2;

        const lerpFactor = 1 - Math.pow(0.02, dt);
        camera.x += (targetX - camera.x) * lerpFactor;
        camera.y += (targetY - camera.y) * lerpFactor;

        // Clamp
        const maxX = MAP_W * SCALED - canvas.width;
        const maxY = MAP_H * SCALED - canvas.height;
        camera.x = Math.max(0, Math.min(maxX, camera.x));
        camera.y = Math.max(0, Math.min(maxY, camera.y));
      }

      function updateTime(dt: number) {
        gameTime += (24 / DAY_SECONDS) * dt;
        if (gameTime >= 24) {
          gameTime -= 24;
          dayCount++;
          // Reset crops on new day (cycle)
          for (const crop of crops) {
            if (crop.stage >= 4) {
              crop.stage = 0;
              crop.progress = 0;
            }
          }
        }
      }

      // ── RENDER FUNCTIONS ──

      function getDayNightOverlay(): { color: string; alpha: number } {
        const hour = gameTime % 24;

        if (hour >= 5 && hour < 7) {
          // Dawn - warm golden
          const t = (hour - 5) / 2;
          return { color: `rgba(255, 180, 80, ${0.25 * (1 - t)})`, alpha: 0.25 * (1 - t) };
        } else if (hour >= 7 && hour < 17) {
          // Day - no overlay
          return { color: 'rgba(0,0,0,0)', alpha: 0 };
        } else if (hour >= 17 && hour < 19) {
          // Dusk - orange/pink
          const t = (hour - 17) / 2;
          return { color: `rgba(200, 80, 40, ${0.15 * t})`, alpha: 0.15 * t };
        } else if (hour >= 19 && hour < 20) {
          // Twilight transition
          const t = (hour - 19);
          return { color: `rgba(10, 10, 50, ${0.35 * t})`, alpha: 0.35 * t };
        } else {
          // Night
          return { color: 'rgba(10, 10, 50, 0.4)', alpha: 0.4 };
        }
      }

      function isNightTime(): boolean {
        const hour = gameTime % 24;
        return hour >= 19.5 || hour < 5;
      }

      function render(time: number) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;

        // ── Visible tile range ──
        const startTileX = Math.max(0, Math.floor(camera.x / SCALED) - 1);
        const startTileY = Math.max(0, Math.floor(camera.y / SCALED) - 1);
        const endTileX = Math.min(MAP_W, Math.ceil((camera.x + w) / SCALED) + 1);
        const endTileY = Math.min(MAP_H, Math.ceil((camera.y + h) / SCALED) + 1);

        // ── Draw ground tiles ──
        const waterPhase = Math.floor(time * 2) % 4;
        for (let y = startTileY; y < endTileY; y++) {
          for (let x = startTileX; x < endTileX; x++) {
            const tileIdx = tilemap[y][x];
            const screenX = x * SCALED - camera.x;
            const screenY = y * SCALED - camera.y;

            // Animate water tiles
            let drawIdx = tileIdx;
            if (tileIdx >= T_WATER[0] && tileIdx <= T_WATER[T_WATER.length - 1]) {
              drawIdx = T_WATER[0] + ((tileIdx - T_WATER[0] + waterPhase) % T_WATER.length);
            }

            drawTileFromSheet(ctx, sprites.tileset, drawIdx, 12, screenX, screenY);
          }
        }

        // ── Collect all Y-sorted drawables ──
        interface Drawable {
          sortY: number;
          draw: () => void;
        }
        const drawables: Drawable[] = [];

        // Helper for screen position
        function toScreen(tx: number, ty: number) {
          return { sx: tx * SCALED - camera.x, sy: ty * SCALED - camera.y };
        }

        // -- House (rendered as a large object) --
        const hsx = 18 * SCALED - camera.x;
        const hsy = 5 * SCALED - camera.y;
        drawables.push({
          sortY: 5 + 6, // bottom of house
          draw: () => {
            // Draw the full house sprite (14 cols × 7 rows from House.png = 224×112)
            drawSpritePortion(ctx, sprites.house, 0, 0, 224, 112, hsx, hsy, 224 * SCALE, 112 * SCALE);
          }
        });

        // -- Map objects (trees, fences, decorations) --
        for (const obj of mapObjects) {
          if (obj.type === 'tree') {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                // Maple Tree: 10 cols × 3 rows, each tree is 2 cols × 3 rows
                // 5 tree variants: variant 0-4
                const v = obj.variant % 5;
                drawSpritePortion(ctx, sprites.mapleTree,
                  v * 2 * TILE, 0, 2 * TILE, 3 * TILE,
                  sx - SCALED * 0.5, sy - SCALED * 2, 2 * SCALED, 3 * SCALED
                );

                // Subtle sway
                const sway = Math.sin(time * 0.8 + obj.x * 2 + obj.y) * 0.5;
                if (Math.abs(sway) > 0.2) {
                  // We could shift the canopy, but keep it simple
                }
              }
            });
          } else if (obj.type.startsWith('fence')) {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                // Fence: 3 cols × 5 rows
                let srcCol = 1, srcRow = 0;
                if (obj.type === 'fence_h') { srcCol = 1; srcRow = obj.variant % 5; }
                else if (obj.type === 'fence_v') { srcCol = 1; srcRow = obj.variant % 5; }
                else if (obj.type === 'fence_corner_tl') { srcCol = 0; srcRow = 0; }
                else if (obj.type === 'fence_corner_tr') { srcCol = 2; srcRow = 0; }
                else if (obj.type === 'fence_corner_bl') { srcCol = 0; srcRow = 2; }
                else if (obj.type === 'fence_corner_br') { srcCol = 2; srcRow = 2; }
                drawTileFromSheet(ctx, sprites.fence, srcRow * 3 + srcCol, 3, sx, sy);
              }
            });
          } else if (obj.type === 'flower_dec') {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                // Use flower tiles from tileset
                const tile = T_FLOWER[obj.variant % T_FLOWER.length];
                drawTileFromSheet(ctx, sprites.tileset, tile, 12, sx, sy);
              }
            });
          } else if (obj.type === 'rock_dec') {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                const tile = T_ROCK[obj.variant % T_ROCK.length];
                drawTileFromSheet(ctx, sprites.tileset, tile, 12, sx, sy);
              }
            });
          } else if (obj.type === 'tall_grass') {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                const tile = T_TALL_GRASS[obj.variant % T_TALL_GRASS.length];
                drawTileFromSheet(ctx, sprites.tileset, tile, 12, sx, sy);
              }
            });
          } else if (obj.type === 'chest') {
            drawables.push({
              sortY: obj.sortY,
              draw: () => {
                const { sx, sy } = toScreen(obj.x, obj.y);
                // Chest: 2 cols × 2 rows, use first frame
                drawSpritePortion(ctx, sprites.chest, 0, 0, TILE, TILE, sx, sy, SCALED, SCALED);
              }
            });
          }
        }

        // -- Crops --
        for (const crop of crops) {
          drawables.push({
            sortY: crop.y + 0.5,
            draw: () => {
              const { sx, sy } = toScreen(crop.x, crop.y);
              // Spring Crops: 14 cols × 8 rows
              // 4 crop types (rows 0-3), each with growth stages across columns
              // Stages: seeds(0-2), sprouts(3-5), growing(6-8), mature(9-11), harvest(12-13)
              const stageCols = [0, 3, 6, 9, 12];
              const srcCol = stageCols[Math.min(crop.stage, 4)];
              const srcRow = crop.type;
              drawSpritePortion(ctx, sprites.springCrops,
                srcCol * TILE, srcRow * TILE, TILE, TILE,
                sx, sy, SCALED, SCALED
              );
            }
          });
        }

        // -- Farmer --
        drawables.push({
          sortY: farmer.y + 0.8,
          draw: () => {
            const { sx, sy } = toScreen(farmer.x - 0.5, farmer.y - 1);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(
              sx + SCALED * 0.5, sy + SCALED * 1.9,
              SCALED * 0.35, SCALED * 0.12,
              0, 0, Math.PI * 2
            );
            ctx.fill();

            // Sprite
            const sheet = farmer.moving ? sprites.walk : sprites.idle;
            const cols = farmer.moving ? 12 : 8;
            const numFrames = farmer.moving ? 3 : 2;
            const frame = Math.floor(farmer.frame) % numFrames;
            const dir = farmer.direction;

            // Idle: row = dir, col = frame (0-1)
            // Walk: row = dir, col = frame (0-2)
            const srcCol = dir * (farmer.moving ? 3 : 2) + frame;
            const srcRow = dir;

            drawTileFromSheet(ctx, sheet, srcRow * cols + srcCol, cols, sx, sy);
          }
        });

        // -- Chickens --
        for (let i = 0; i < chickens.length; i++) {
          const chicken = chickens[i];
          const sheet = i === 0 ? sprites.babyChicken : (i === 1 ? sprites.chickenBlonde : sprites.chickenRed);
          const sheetCols = sheet.width / TILE;

          drawables.push({
            sortY: chicken.y + 0.5,
            draw: () => {
              const { sx, sy } = toScreen(chicken.x - 0.3, chicken.y - 0.6);

              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.12)';
              ctx.beginPath();
              ctx.ellipse(
                sx + SCALED * 0.4, sy + SCALED * 0.95,
                SCALED * 0.25, SCALED * 0.08,
                0, 0, Math.PI * 2
              );
              ctx.fill();

              const frame = Math.floor(chicken.frame) % 4;
              const dir = chicken.direction;
              // Chicken sprites: assume rows = animation state, cols = frames
              // Simplified: use first 2 rows for down/up, cols 0-3 for animation
              const srcRow = dir <= 1 ? 0 : 1;
              drawTileFromSheet(ctx, sheet, srcRow * sheetCols + frame, sheetCols, sx, sy);
            }
          });
        }

        // -- Cows --
        const cowSprites = [sprites.femaleCow, sprites.maleCow];
        for (let i = 0; i < cows.length; i++) {
          const cow = cows[i];
          const sheet = cowSprites[i];

          drawables.push({
            sortY: cow.y + 1,
            draw: () => {
              const { sx, sy } = toScreen(cow.x - 0.5, cow.y - 1);

              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.12)';
              ctx.beginPath();
              ctx.ellipse(
                sx + SCALED * 0.8, sy + SCALED * 1.85,
                SCALED * 0.55, SCALED * 0.15,
                0, 0, Math.PI * 2
              );
              ctx.fill();

              // Cow sprite: 8 cols × 6 rows, 4 dirs × 2 frames
              // Row = direction, col = frame
              const frame = Math.floor(cow.frame) % 2;
              const dir = cow.direction;
              drawTileFromSheet(ctx, sheet, dir * 2 + frame, 8, sx, sy);
            }
          });
        }

        // ── Sort and draw all ──
        drawables.sort((a, b) => a.sortY - b.sortY);
        for (const d of drawables) {
          d.draw();
        }

        // ── Day/Night overlay ──
        const overlay = getDayNightOverlay();
        if (overlay.alpha > 0) {
          ctx.fillStyle = overlay.color;
          ctx.fillRect(0, 0, w, h);
        }

        // ── Stars at night ──
        if (isNightTime()) {
          let starAlpha = 1;
          if (gameTime >= 19.5) starAlpha = Math.min(1, (gameTime - 19.5) * 2);
          else if (gameTime < 5) starAlpha = Math.min(1, (5 - gameTime) * 2);
          for (const star of stars) {
            const sx = star.x - camera.x;
            const sy = star.y - camera.y;
            if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
            const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.x);
            ctx.fillStyle = `rgba(255, 255, 230, ${star.brightness * twinkle * Math.min(starAlpha, 1)})`;
            ctx.fillRect(sx, sy, 2, 2);
          }
        }

        // ── Particles ──
        for (const p of particles) {
          const sx = p.x * SCALED - camera.x;
          const sy = p.y * SCALED - camera.y;
          if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

          const lifeRatio = p.life / p.maxLife;
          const alpha = lifeRatio < 0.1 ? lifeRatio * 10 : (lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1);

          if (p.type === 'butterfly') {
            // Draw butterfly as small colored wings
            const wingFlap = Math.sin(time * 12 + p.phase) * 3;
            ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
            ctx.fillRect(sx - wingFlap - p.size, sy - p.size * 0.5, p.size, p.size);
            ctx.fillRect(sx + wingFlap, sy - p.size * 0.5, p.size, p.size);
            ctx.fillStyle = '#333';
            ctx.fillRect(sx - 0.5, sy - 1, 1, 2);
          } else if (p.type === 'seed') {
            ctx.fillStyle = `rgba(254, 243, 199, ${alpha * 0.7})`;
            ctx.fillRect(sx, sy, p.size, p.size);
          } else if (p.type === 'firefly') {
            const glow = 0.5 + 0.5 * Math.sin(time * 5 + p.phase);
            const r = p.size * (0.8 + glow * 0.4);
            ctx.fillStyle = `rgba(253, 224, 71, ${alpha * glow * 0.8})`;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
            // Glow
            ctx.fillStyle = `rgba(253, 224, 71, ${alpha * glow * 0.2})`;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'dust') {
            ctx.fillStyle = `rgba(196, 167, 106, ${alpha * 0.5})`;
            ctx.fillRect(sx, sy, p.size, p.size);
          }
        }

        // ── Water shimmer ──
        for (let y = startTileY; y < endTileY; y++) {
          for (let x = startTileX; x < endTileX; x++) {
            if (tilemap[y][x] >= T_WATER[0] && tilemap[y][x] <= T_WATER[T_WATER.length - 1]) {
              const sx = x * SCALED - camera.x;
              const sy = y * SCALED - camera.y;
              const shimmer = Math.sin(time * 3 + x * 2 + y * 1.5) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(200, 230, 255, ${shimmer * 0.15})`;
              ctx.fillRect(sx, sy, SCALED, SCALED);
            }
          }
        }

        // ── UI Overlay ──
        drawUI(time);
      }

      function drawUI(time: number) {
        const w = canvas.width;
        const hour = gameTime % 24;
        const h12 = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const minutes = Math.floor((hour % 1) * 60);
        const timeStr = `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        // Background panel
        const panelW = 140;
        const panelH = 70;
        const panelX = w - panelW - 12;
        const panelY = 12;

        ctx.fillStyle = 'rgba(20, 15, 10, 0.65)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180, 150, 100, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Time icon (sun/moon)
        const iconX = panelX + 18;
        const iconY = panelY + 20;
        if (hour >= 6 && hour < 19) {
          // Sun
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(iconX, iconY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2 + time * 0.3;
            ctx.beginPath();
            ctx.moveTo(iconX + Math.cos(angle) * 8, iconY + Math.sin(angle) * 8);
            ctx.lineTo(iconX + Math.cos(angle) * 10, iconY + Math.sin(angle) * 10);
            ctx.stroke();
          }
        } else {
          // Moon
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(iconX, iconY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(20, 15, 10, 0.8)';
          ctx.beginPath();
          ctx.arc(iconX + 2, iconY - 1, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Time text
        ctx.fillStyle = '#e8d5b7';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(timeStr, panelX + 32, panelY + 24);

        // Day count
        ctx.fillStyle = '#a89070';
        ctx.font = '11px monospace';
        ctx.fillText(`Day ${dayCount}`, panelX + 12, panelY + 44);

        // Season
        ctx.fillStyle = '#7cba5c';
        ctx.fillText('Spring', panelX + 72, panelY + 44);

        // Farmer state (subtle)
        if (farmer.state && farmer.state !== 'idle') {
          const stateText = farmer.state === 'farm' ? 'Tending crops'
            : farmer.state === 'animals' ? 'Checking animals'
            : farmer.state === 'pond' ? 'Admiring pond'
            : farmer.state === 'sleep' ? 'Sleeping...'
            : farmer.state;
          ctx.fillStyle = 'rgba(168, 144, 112, 0.6)';
          ctx.font = '10px monospace';
          ctx.fillText(stateText, panelX + 12, panelY + 60);
        }
      }

      // ── GAME LOOP ──
      let lastTime = performance.now();

      function gameLoop(timestamp: number) {
        if (!running) return;

        const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap delta time
        lastTime = timestamp;

        // Update
        updateTime(dt);
        updateFarmer(dt);
        for (const c of chickens) updateAnimal(c, animalBounds, dt);
        for (const c of cows) updateAnimal(c, animalBounds, dt);
        updateCrops(dt);
        updateParticles(dt, timestamp / 1000);
        updateCamera(dt);

        // Render
        render(timestamp / 1000);

        animFrameId = requestAnimationFrame(gameLoop);
      }

      // Start
      animFrameId = requestAnimationFrame(gameLoop);

      // Cleanup
      return () => {
        running = false;
        cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
      };
    }

    init();

    return () => { running = false; };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        imageRendering: 'pixelated',
      }}
    />
  );
}