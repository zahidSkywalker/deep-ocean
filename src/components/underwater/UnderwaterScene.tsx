'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// ─── Asset Map ───────────────────────────────────────────────────────
const FISH_WITH_SKELETON = [
  { skin: '/assets/fish_blue.png', skeleton: '/assets/fish_blue_skeleton.png', w: 48, h: 32, name: 'Blue Fish' },
  { skin: '/assets/fish_brown.png', skeleton: null, w: 52, h: 34, name: 'Brown Fish' },
  { skin: '/assets/fish_green.png', skeleton: '/assets/fish_green_skeleton.png', w: 46, h: 30, name: 'Green Fish' },
  { skin: '/assets/fish_grey.png', skeleton: null, w: 50, h: 32, name: 'Grey Fish' },
  { skin: '/assets/fish_orange.png', skeleton: '/assets/fish_orange_skeleton.png', w: 54, h: 34, name: 'Orange Fish' },
  { skin: '/assets/fish_pink.png', skeleton: '/assets/fish_pink_skeleton.png', w: 44, h: 28, name: 'Pink Fish' },
  { skin: '/assets/fish_red.png', skeleton: '/assets/fish_red_skeleton.png', w: 56, h: 36, name: 'Red Fish' },
  { skin: '/assets/fish_grey_long_a.png', skeleton: null, w: 72, h: 26, name: 'Long Grey A' },
  { skin: '/assets/fish_grey_long_b.png', skeleton: null, w: 68, h: 28, name: 'Long Grey B' },
];

const SEAWEED_ALL = [
  '/assets/seaweed_green_a.png', '/assets/seaweed_green_b.png',
  '/assets/seaweed_green_c.png', '/assets/seaweed_green_d.png',
  '/assets/seaweed_orange_a.png', '/assets/seaweed_orange_b.png',
  '/assets/seaweed_pink_a.png', '/assets/seaweed_pink_b.png',
  '/assets/seaweed_pink_c.png', '/assets/seaweed_pink_d.png',
  '/assets/seaweed_grass_a.png', '/assets/seaweed_grass_b.png',
];

const BUBBLES = ['/assets/bubble_a.png', '/assets/bubble_b.png', '/assets/bubble_c.png'];
const ROCKS = [
  { src: '/assets/rock_a.png', w: 80, h: 50 },
  { src: '/assets/rock_b.png', w: 70, h: 45 },
];
const TERRAIN_TOP = [
  '/assets/terrain_sand_top_a.png', '/assets/terrain_sand_top_b.png',
  '/assets/terrain_sand_top_c.png', '/assets/terrain_sand_top_d.png',
  '/assets/terrain_sand_top_e.png', '/assets/terrain_sand_top_f.png',
  '/assets/terrain_sand_top_g.png', '/assets/terrain_sand_top_h.png',
];
const BG_SEAWEED = [
  '/assets/background_seaweed_a.png', '/assets/background_seaweed_b.png',
  '/assets/background_seaweed_c.png', '/assets/background_seaweed_d.png',
  '/assets/background_seaweed_e.png', '/assets/background_seaweed_f.png',
  '/assets/background_seaweed_g.png', '/assets/background_seaweed_h.png',
];

// ─── Types ───────────────────────────────────────────────────────────
interface FishEntity {
  x: number; y: number; vx: number; vy: number;
  skinImg: HTMLImageElement; skeletonImg: HTMLImageElement | null;
  w: number; h: number; scale: number; flip: boolean;
  wobblePhase: number; wobbleSpeed: number; wobbleAmp: number;
  tailPhase: number; layer: 'mid' | 'back' | 'front';
  opacity: number; skinAlpha: number; name: string;
  caught: boolean; catchAnim: number;
  fleeing: boolean; fleeTimer: number;
}

interface BubbleEntity {
  x: number; y: number; vy: number; size: number;
  img: HTMLImageElement; wobblePhase: number;
  opacity: number; life: number; maxLife: number;
}

interface SeaweedEntity {
  x: number; y: number; img: HTMLImageElement;
  scale: number; swayPhase: number; swaySpeed: number; swayAmp: number;
}

interface ParticleEntity {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; life: number; maxLife: number; color: string;
}

interface LightRay { x: number; width: number; opacity: number; speed: number; phase: number; }

interface JellyfishEntity {
  x: number; y: number; vx: number; vy: number;
  pulsePhase: number; scale: number; color: string; opacity: number;
}

interface SharkEntity {
  x: number; y: number; vx: number; vy: number;
  scale: number; active: boolean; cooldown: number;
  enterPhase: number;
}

interface SchoolEntity {
  x: number; y: number; vx: number; vy: number;
  fish: { ox: number; oy: number; angle: number; speed: number; }[];
  color: string; size: number; radius: number;
}

interface RippleEntity {
  x: number; y: number; radius: number; maxRadius: number;
  opacity: number; life: number;
}

interface FoodPellet {
  x: number; y: number; vy: number; size: number;
  life: number; eaten: boolean;
}

interface FloorItem {
  x: number; y: number; type: 'starfish' | 'crab' | 'shell' | 'coral';
  color: string; size: number; angle: number;
  moveTimer: number; moveDir: number;
}

interface Wreckage {
  x: number; y: number; type: 'chest' | 'anchor' | 'ship';
  scale: number;
}

interface Bioluminescence {
  x: number; y: number; size: number; color: string;
  phase: number; speed: number; maxOpacity: number;
}

type GameMode = 'observe' | 'quiz' | 'findSkeleton' | 'photography' | 'feed';

interface GameState {
  mode: GameMode;
  score: number;
  quizTarget: number;
  quizAnswer: number;
  quizPhase: 'question' | 'result';
  quizCorrect: boolean;
  findSkeletonTarget: { x: number; y: number; fishIdx: number } | null;
  findSkeletonFound: boolean;
  findSkeletonTimer: number;
  photos: { dataUrl: string; name: string; }[];
  showUI: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
function randInt(a: number, b: number) { return Math.floor(rand(a, b)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function dist(x1: number, y1: number, x2: number, y2: number) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }

// ─── Main Component ──────────────────────────────────────────────────
export default function UnderwaterScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [uiState, setUiState] = useState<GameState>({
    mode: 'observe', score: 0,
    quizTarget: 0, quizAnswer: 0, quizPhase: 'question', quizCorrect: false,
    findSkeletonTarget: null, findSkeletonFound: false, findSkeletonTimer: 0,
    photos: [], showUI: false,
  });
  const uiRef = useRef(uiState);
  uiRef.current = uiState;

  const stateRef = useRef<{
    fish: FishEntity[]; bubbles: BubbleEntity[]; seaweed: SeaweedEntity[];
    particles: ParticleEntity[]; lightRays: LightRay[]; jellyfish: JellyfishEntity[];
    terrainTop: HTMLImageElement[]; bgSeaweed: HTMLImageElement[];
    rocks: { img: HTMLImageElement; x: number; w: number; h: number; scale: number }[];
    shark: SharkEntity; schools: SchoolEntity[];
    ripples: RippleEntity[]; food: FoodPellet[];
    floorItems: FloorItem[]; wreckage: Wreckage[];
    biolum: Bioluminescence[];
    bubbleTrail: { x: number; y: number; size: number; opacity: number; life: number; }[];
    time: number; mouseX: number; mouseY: number;
    width: number; height: number; started: boolean; dpr: number;
    dayPhase: number; // 0=day, 1=night cycle
    cameraX: number; cameraY: number; cameraZoom: number;
    isDragging: boolean; dragStartX: number; dragStartY: number;
    dragCamStartX: number; dragCamStartY: number;
    touchDist: number; touchZoomStart: number;
    audioCtx: AudioContext | null; audioStarted: boolean;
    floorY: number;
  }>({
    fish: [], bubbles: [], seaweed: [], particles: [], lightRays: [], jellyfish: [],
    terrainTop: [], bgSeaweed: [], rocks: [],
    shark: { x: -300, y: 0, vx: 0, vy: 0, scale: 1.5, active: false, cooldown: 600, enterPhase: 0 },
    schools: [], ripples: [], food: [], floorItems: [], wreckage: [], biolum: [],
    bubbleTrail: [],
    time: 0, mouseX: 0, mouseY: 0, width: 0, height: 0, started: false, dpr: 1,
    dayPhase: 0, cameraX: 0, cameraY: 0, cameraZoom: 1,
    isDragging: false, dragStartX: 0, dragStartY: 0, dragCamStartX: 0, dragCamStartY: 0,
    touchDist: 0, touchZoomStart: 1,
    audioCtx: null, audioStarted: false, floorY: 0,
  });

  const loadImg = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const s = stateRef.current;

    // ─── Load all images ───────────────────────────────────────────
    const allSources = [
      ...FISH_WITH_SKELETON.flatMap(f => [f.skin, f.skeleton].filter(Boolean) as string[]),
      ...SEAWEED_ALL, ...BUBBLES, ...ROCKS.map(r => r.src),
      ...TERRAIN_TOP, ...BG_SEAWEED,
    ];
    const imageMap = new Map<string, HTMLImageElement>();

    async function loadAll() {
      await Promise.all(allSources.map(async (src) => {
        try { const img = await loadImg(src); imageMap.set(src, img); } catch {}
      }));
      initScene();
    }
    function getImg(src: string) { return imageMap.get(src); }

    // ─── Init Scene ────────────────────────────────────────────────
    function initScene() {
      const W = s.width, H = s.height;
      s.floorY = H * 0.82;
      const fishCount = W < 600 ? 20 : W < 1000 ? 28 : 38;

      // Fish
      s.fish = [];
      for (let i = 0; i < fishCount; i++) {
        const def = FISH_WITH_SKELETON[randInt(0, FISH_WITH_SKELETON.length)];
        const skinImg = getImg(def.skin);
        if (!skinImg) continue;
        const skeletonImg = def.skeleton ? getImg(def.skeleton) || null : null;
        const layer = i < 7 ? 'back' as const : i < Math.floor(fishCount*0.7) ? 'mid' as const : 'front' as const;
        const sc = layer === 'back' ? rand(0.5,0.7) : layer === 'mid' ? rand(0.8,1.2) : rand(1.1,1.6);
        const goR = Math.random() > 0.5;
        s.fish.push({
          x: rand(-100, W+100), y: rand(H*0.08, H*0.72),
          vx: (goR?1:-1)*rand(0.3, layer==='back'?1:2.2)*(layer==='back'?0.5:layer==='mid'?0.8:1),
          vy: rand(-0.1,0.1),
          skinImg, skeletonImg, w: def.w, h: def.h,
          scale: sc, flip: !goR,
          wobblePhase: rand(0,Math.PI*2), wobbleSpeed: rand(0.01,0.03), wobbleAmp: rand(0.3,1.5),
          tailPhase: rand(0,Math.PI*2), layer,
          opacity: layer==='back'?rand(0.3,0.5):layer==='mid'?rand(0.6,0.85):rand(0.8,1),
          skinAlpha: rand(0.55,0.82), name: def.name,
          caught: false, catchAnim: 0, fleeing: false, fleeTimer: 0,
        });
      }

      // Bubbles
      s.bubbles = [];
      for (let i = 0; i < 40; i++) spawnBubble(true);

      // Seaweed
      s.seaweed = [];
      for (let i = 0; i < 22; i++) {
        const src = SEAWEED_ALL[randInt(0, SEAWEED_ALL.length)];
        const img = getImg(src);
        if (!img) continue;
        s.seaweed.push({ x: rand(10,W-10), y: H-rand(0,30), img, scale: rand(0.8,1.8), swayPhase: rand(0,Math.PI*2), swaySpeed: rand(0.008,0.02), swayAmp: rand(3,12) });
      }
      s.seaweed.sort((a,b) => a.scale - b.scale);

      // Background seaweed
      s.bgSeaweed = BG_SEAWEED.map(src => getImg(src)).filter(Boolean) as HTMLImageElement[];

      // Rocks
      s.rocks = [];
      for (let i = 0; i < 6; i++) {
        const rd = ROCKS[randInt(0, ROCKS.length)];
        const img = getImg(rd.src);
        if (!img) continue;
        s.rocks.push({ img, x: rand(20,W-80), w: rd.w, h: rd.h, scale: rand(0.8,1.6) });
      }
      s.rocks.sort((a,b) => a.scale - b.scale);

      // Terrain
      s.terrainTop = TERRAIN_TOP.map(src => getImg(src)).filter(Boolean) as HTMLImageElement[];

      // Light rays
      s.lightRays = Array.from({length:7}, () => ({ x: rand(W*0.05,W*0.95), width: rand(40,120), opacity: rand(0.02,0.07), speed: rand(0.1,0.3), phase: rand(0,Math.PI*2) }));

      // Jellyfish
      const jellyCols = ['rgba(180,120,255,','rgba(120,200,255,','rgba(255,150,200,','rgba(100,255,200,'];
      s.jellyfish = Array.from({length:4}, (_, i) => ({
        x: rand(50,W-50), y: rand(H*0.05,H*0.45), vx: rand(-0.15,0.15), vy: rand(-0.3,-0.05),
        pulsePhase: rand(0,Math.PI*2), scale: rand(0.6,1.2), color: jellyCols[i%4], opacity: rand(0.15,0.35),
      }));

      // Particles
      s.particles = Array.from({length:60}, () => ({
        x: rand(0,W), y: rand(0,H), vx: rand(-0.15,0.15), vy: rand(-0.1,0.1),
        size: rand(1,3), opacity: rand(0.15,0.5), life: rand(0,500), maxLife: rand(400,800),
        color: Math.random()>0.5 ? '#7dd3fc' : '#a7f3d0',
      }));

      // Schools of tiny fish
      const schoolColors = ['#60a5fa','#f472b6','#34d399','#fbbf24'];
      s.schools = Array.from({length:3}, (_, i) => {
        const cx = rand(W*0.1, W*0.9), cy = rand(H*0.15, H*0.5);
        const r = rand(30,60);
        const count = randInt(12,25);
        return {
          x: cx, y: cy, vx: rand(-0.4,0.4), vy: rand(-0.1,0.1),
          fish: Array.from({length:count}, () => ({
            ox: rand(-r,r), oy: rand(-r*0.5,r*0.5),
            angle: rand(0,Math.PI*2), speed: rand(0.02,0.06),
          })),
          color: schoolColors[i%4], size: rand(3,5), radius: r,
        };
      });

      // Floor items (starfish, crabs, shells, coral)
      s.floorItems = [];
      const floorItemTypes: FloorItem['type'][] = ['starfish','starfish','crab','crab','shell','shell','shell','coral','coral','coral','coral'];
      const itemColors: Record<string, string[]> = {
        starfish: ['#f97316','#ef4444','#eab308'],
        crab: ['#dc2626','#b91c1c','#991b1b'],
        shell: ['#fef3c7','#fde68a','#d1fae5'],
        coral: ['#f472b6','#c084fc','#fb923c','#f87171','#38bdf8'],
      };
      for (let i = 0; i < 18; i++) {
        const t = floorItemTypes[randInt(0, floorItemTypes.length)];
        s.floorItems.push({
          x: rand(30, W-30), y: s.floorY + rand(-5, H*0.12),
          type: t, color: itemColors[t][randInt(0, itemColors[t].length)],
          size: rand(8,18), angle: rand(0,Math.PI*2),
          moveTimer: 0, moveDir: Math.random()>0.5?1:-1,
        });
      }

      // Wreckage
      s.wreckage = [
        { x: rand(W*0.1, W*0.3), y: s.floorY + rand(10,40), type: 'chest', scale: rand(1,1.5) },
        { x: rand(W*0.6, W*0.9), y: s.floorY + rand(5,25), type: 'anchor', scale: rand(1,1.3) },
        { x: rand(W*0.3, W*0.7), y: s.floorY + rand(20,60), type: 'ship', scale: rand(0.8,1.2) },
      ];

      // Bioluminescence
      s.biolum = Array.from({length:15}, () => ({
        x: rand(0,W), y: rand(H*0.3,H*0.85), size: rand(2,6),
        color: ['#67e8f9','#a78bfa','#f0abfc','#6ee7b7'][randInt(0,4)],
        phase: rand(0,Math.PI*2), speed: rand(0.005,0.02), maxOpacity: rand(0.15,0.4),
      }));

      s.started = true;
    }

    function spawnBubble(initial = false) {
      const W = s.width, H = s.height;
      const img = getImg(BUBBLES[randInt(0, BUBBLES.length)]);
      if (!img) return;
      s.bubbles.push({ x: rand(20,W-20), y: initial?rand(H*0.1,H*0.85):H+rand(10,50), vy: rand(0.3,1.2), size: rand(8,28), img, wobblePhase: rand(0,Math.PI*2), opacity: rand(0.3,0.7), life:0, maxLife:rand(300,700) });
    }

    // ─── Audio ─────────────────────────────────────────────────────
    function initAudio() {
      if (s.audioStarted) return;
      s.audioStarted = true;
      try {
        const ac = new AudioContext();
        s.audioCtx = ac;
        // Ambient deep ocean drone
        const osc1 = ac.createOscillator();
        const gain1 = ac.createGain();
        osc1.type = 'sine'; osc1.frequency.value = 55;
        gain1.gain.value = 0.03;
        osc1.connect(gain1).connect(ac.destination);
        osc1.start();
        // Higher harmonic
        const osc2 = ac.createOscillator();
        const gain2 = ac.createGain();
        osc2.type = 'sine'; osc2.frequency.value = 82;
        gain2.gain.value = 0.015;
        osc2.connect(gain2).connect(ac.destination);
        osc2.start();
        // LFO for wave-like modulation
        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();
        lfo.frequency.value = 0.15;
        lfoGain.gain.value = 8;
        lfo.connect(lfoGain).connect(osc1.frequency);
        lfo.start();
      } catch {}
    }

    // ─── Resize ────────────────────────────────────────────────────
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.dpr = dpr;
      const W = window.innerWidth, H = window.innerHeight;
      s.width = W; s.height = H; s.floorY = H * 0.82;
      canvas!.width = W * dpr; canvas!.height = H * dpr;
      canvas!.style.width = W + 'px'; canvas!.style.height = H + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // ─── Input ─────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      s.mouseX = e.clientX; s.mouseY = e.clientY;
      // Bubble trail
      if (Math.random() > 0.6) {
        s.bubbleTrail.push({ x: e.clientX, y: e.clientY, size: rand(2,5), opacity: 0.4, life: 0 });
      }
    }
    function onMouseDown(e: MouseEvent) {
      initAudio();
      const ui = uiRef.current;
      if (ui.mode === 'observe' || ui.mode === 'feed') {
        // Ripple
        s.ripples.push({ x: e.clientX, y: e.clientY, radius: 0, maxRadius: 200, opacity: 0.6, life: 0 });
        // Push fish
        for (const f of s.fish) {
          const d = dist(f.x, f.y, e.clientX, e.clientY);
          if (d < 200 && d > 0) {
            const force = (200 - d) / 200 * 2;
            f.vx += ((f.x - e.clientX) / d) * force;
            f.vy += ((f.y - e.clientY) / d) * force;
            f.fleeing = true; f.fleeTimer = 60;
          }
        }
        // Feed mode: drop food
        if (ui.mode === 'feed') {
          s.food.push({ x: e.clientX, y: e.clientY, vy: 0.3, size: 4, life: 0, eaten: false });
        }
        // Catch fish on click
        if (ui.mode === 'observe') {
          for (const f of s.fish) {
            if (f.caught) continue;
            const d = dist(f.x, f.y, e.clientX, e.clientY);
            if (d < f.w * f.scale * 0.6) {
              f.caught = true; f.catchAnim = 30;
              setUiState(prev => ({ ...prev, score: prev.score + 10 }));
              break;
            }
          }
        }
      }
      // Photography mode: capture
      if (ui.mode === 'photography') {
        const dataUrl = canvas!.toDataURL('image/png');
        // Find closest fish to click
        let closest: FishEntity | null = null, closestDist = 60;
        for (const f of s.fish) {
          const d = dist(f.x, f.y, e.clientX, e.clientY);
          if (d < closestDist) { closestDist = d; closest = f; }
        }
        if (closest) {
          setUiState(prev => ({ ...prev, photos: [...prev.photos, { dataUrl, name: closest!.name }] }));
        }
      }
      // Find skeleton mode
      if (ui.mode === 'findSkeleton' && ui.findSkeletonTarget) {
        const ft = ui.findSkeletonTarget;
        if (dist(e.clientX, e.clientY, ft.x, ft.y) < 50) {
          setUiState(prev => ({ ...prev, findSkeletonFound: true, score: prev.score + 25 }));
        }
      }
      s.isDragging = true; s.dragStartX = e.clientX; s.dragStartY = e.clientY;
      s.dragCamStartX = s.cameraX; s.dragCamStartY = s.cameraY;
    }
    function onMouseUp() { s.isDragging = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Touch
    function onTouchStart(e: TouchEvent) {
      e.preventDefault(); initAudio();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        s.mouseX = t.clientX; s.mouseY = t.clientY;
        onMouseDown({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
      if (e.touches.length === 2) {
        s.touchDist = dist(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
        s.touchZoomStart = s.cameraZoom;
      }
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1 && s.isDragging) {
        const t = e.touches[0];
        s.mouseX = t.clientX; s.mouseY = t.clientY;
        s.cameraX = s.dragCamStartX - (t.clientX - s.dragStartX) / s.cameraZoom;
        s.cameraY = s.dragCamStartY - (t.clientY - s.dragStartY) / s.cameraZoom;
      }
      if (e.touches.length === 2) {
        const nd = dist(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
        s.cameraZoom = clamp(s.touchZoomStart * (nd / s.touchDist), 0.5, 3);
      }
    }
    function onTouchEnd(e: TouchEvent) { e.preventDefault(); s.isDragging = false; }
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Mouse wheel zoom
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      s.cameraZoom = clamp(s.cameraZoom - e.deltaY * 0.001, 0.5, 3);
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // ─── Drawing Functions ─────────────────────────────────────────

    function drawJellyfish(jf: JellyfishEntity, time: number) {
      const pulse = Math.sin(jf.pulsePhase + time*0.02)*0.15+1;
      const w = 40*jf.scale*pulse, h = 25*jf.scale/pulse;
      ctx!.save(); ctx!.globalAlpha = jf.opacity; ctx!.translate(jf.x, jf.y);
      ctx!.beginPath(); ctx!.ellipse(0,0,w,h,0,Math.PI,0);
      const grad = ctx!.createRadialGradient(0,-h*0.3,0,0,0,w);
      const bc = jf.color;
      grad.addColorStop(0, bc+'0.4)'); grad.addColorStop(0.6, bc+'0.15)'); grad.addColorStop(1, bc+'0.05)');
      ctx!.fillStyle = grad; ctx!.fill();
      // Inner glow
      ctx!.beginPath(); ctx!.ellipse(0,-h*0.2,w*0.5,h*0.4,0,Math.PI,0);
      ctx!.fillStyle = 'rgba(255,255,255,0.06)'; ctx!.fill();
      // Tentacles
      for (let t = 0; t < 5; t++) {
        const tx = lerp(-w*0.7, w*0.7, t/4);
        const tl = (20+t*5)*jf.scale;
        ctx!.beginPath(); ctx!.moveTo(tx, 2);
        for (let seg = 0; seg < 6; seg++) {
          ctx!.lineTo(tx + Math.sin(time*0.015+t*1.5+seg*0.8)*(4+seg*1.5)*jf.scale, 2+(seg/6)*tl);
        }
        ctx!.strokeStyle = bc+'0.2)'; ctx!.lineWidth = 1.5; ctx!.stroke();
      }
      ctx!.restore();
    }

    function drawFish(f: FishEntity, time: number) {
      if (f.caught && f.catchAnim <= 0) return;
      const wobbleY = Math.sin(f.wobblePhase + time*f.wobbleSpeed)*f.wobbleAmp;
      const tailWag = Math.sin(f.tailPhase + time*0.08)*0.05;
      const catchScale = f.caught ? 1 + (30-f.catchAnim)/30*0.5 : 1;

      ctx!.save();
      ctx!.translate(f.x, f.y + wobbleY);
      ctx!.scale((f.flip?-1:1)*f.scale*catchScale, (f.scale+tailWag)*catchScale);

      // Skeleton base
      if (f.skeletonImg) {
        ctx!.globalAlpha = f.opacity;
        ctx!.shadowColor = 'rgba(0,0,0,0.1)'; ctx!.shadowBlur = 4; ctx!.shadowOffsetY = 2;
        ctx!.drawImage(f.skeletonImg, -f.w/2, -f.h/2, f.w, f.h);
        ctx!.shadowColor = 'transparent';
      }
      // Skin overlay
      ctx!.globalAlpha = f.opacity * f.skinAlpha * (f.caught ? f.catchAnim/30 : 1);
      ctx!.drawImage(f.skinImg, -f.w/2, -f.h/2, f.w, f.h);

      // Find skeleton mode glow
      const ui = uiRef.current;
      if (ui.mode === 'findSkeleton' && f.skeletonImg && ui.findSkeletonTarget) {
        const ft = ui.findSkeletonTarget;
        if (Math.abs(f.x - ft.x) < 5 && Math.abs(f.y - ft.y) < 5) {
          ctx!.globalAlpha = 0.3 + Math.sin(time*0.05)*0.15;
          ctx!.shadowColor = '#fbbf24'; ctx!.shadowBlur = 15;
          ctx!.drawImage(f.skinImg, -f.w/2, -f.h/2, f.w, f.h);
          ctx!.shadowColor = 'transparent';
        }
      }

      ctx!.restore();
    }

    function drawShark(shark: SharkEntity, time: number) {
      if (!shark.active) return;
      const W = s.width, H = s.height;
      const bodyLen = 120 * shark.scale;
      const bodyH = 30 * shark.scale;
      const tailWag = Math.sin(time * 0.06) * 8 * shark.scale;
      const goRight = shark.vx > 0;

      ctx!.save();
      ctx!.translate(shark.x, shark.y);
      ctx!.scale(goRight ? -1 : 1, 1);
      ctx!.globalAlpha = 0.85;

      // Body
      ctx!.beginPath();
      ctx!.moveTo(-bodyLen/2, 0);
      ctx!.quadraticCurveTo(-bodyLen/4, -bodyH, bodyLen/4, -bodyH*0.3);
      ctx!.lineTo(bodyLen/2 + tailWag, -bodyH*0.8); // tail top
      ctx!.lineTo(bodyLen/2 + tailWag*0.5, 0);
      ctx!.lineTo(bodyLen/2 + tailWag*1.2, bodyH*0.5); // tail bottom
      ctx!.lineTo(bodyLen/4, bodyH*0.2);
      ctx!.quadraticCurveTo(-bodyLen/4, bodyH*0.8, -bodyLen/2, 0);
      ctx!.closePath();
      const grad = ctx!.createLinearGradient(0, -bodyH, 0, bodyH);
      grad.addColorStop(0, '#475569'); grad.addColorStop(0.5, '#64748b'); grad.addColorStop(1, '#94a3b8');
      ctx!.fillStyle = grad; ctx!.fill();

      // Dorsal fin
      ctx!.beginPath();
      ctx!.moveTo(-bodyLen*0.1, -bodyH*0.3);
      ctx!.lineTo(bodyLen*0.05, -bodyH*1.2);
      ctx!.lineTo(bodyLen*0.2, -bodyH*0.25);
      ctx!.closePath();
      ctx!.fillStyle = '#475569'; ctx!.fill();

      // Eye
      ctx!.beginPath();
      ctx!.arc(-bodyLen*0.25, -bodyH*0.15, 3*shark.scale, 0, Math.PI*2);
      ctx!.fillStyle = '#1e293b'; ctx!.fill();
      ctx!.beginPath();
      ctx!.arc(-bodyLen*0.25, -bodyH*0.15, 1.5*shark.scale, 0, Math.PI*2);
      ctx!.fillStyle = '#ef4444'; ctx!.fill();

      // Mouth
      ctx!.beginPath();
      ctx!.moveTo(-bodyLen/2, bodyH*0.1);
      ctx!.lineTo(-bodyLen*0.35, bodyH*0.15);
      ctx!.strokeStyle = '#334155'; ctx!.lineWidth = 1.5; ctx!.stroke();

      ctx!.restore();
    }

    function drawSchool(school: SchoolEntity, time: number) {
      ctx!.save();
      ctx!.globalAlpha = 0.5;
      for (const f of school.fish) {
        const angle = f.angle + time * f.speed;
        const px = school.x + Math.cos(angle) * f.ox - Math.sin(angle) * f.oy;
        const py = school.y + Math.sin(angle) * f.ox + Math.cos(angle) * f.oy;
        const dir = Math.cos(angle + time*f.speed*2) > 0 ? 1 : -1;
        ctx!.save();
        ctx!.translate(px, py);
        ctx!.scale(dir, 1);
        ctx!.fillStyle = school.color;
        ctx!.beginPath();
        // Tiny fish shape
        ctx!.moveTo(school.size, 0);
        ctx!.quadraticCurveTo(0, -school.size*0.6, -school.size, 0);
        ctx!.quadraticCurveTo(0, school.size*0.6, school.size, 0);
        ctx!.fill();
        // Tail
        ctx!.beginPath();
        ctx!.moveTo(-school.size, 0);
        ctx!.lineTo(-school.size*1.5, -school.size*0.4);
        ctx!.lineTo(-school.size*1.5, school.size*0.4);
        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.restore();
    }

    function drawFloorItem(item: FloorItem, time: number) {
      ctx!.save();
      ctx!.translate(item.x, item.y);
      ctx!.rotate(item.angle);
      ctx!.scale(item.size / 16, item.size / 16);

      if (item.type === 'starfish') {
        ctx!.fillStyle = item.color;
        ctx!.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
          ctx!.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
          ctx!.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
        }
        ctx!.closePath(); ctx!.fill();
        // Dots
        ctx!.fillStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 5; i++) {
          const a = (i/5)*Math.PI*2 - Math.PI/2;
          ctx!.beginPath(); ctx!.arc(Math.cos(a)*7, Math.sin(a)*7, 1.2, 0, Math.PI*2); ctx!.fill();
        }
      } else if (item.type === 'crab') {
        // Body
        ctx!.fillStyle = item.color;
        ctx!.beginPath(); ctx!.ellipse(0, 0, 10, 7, 0, 0, Math.PI*2); ctx!.fill();
        // Claws
        const clawAngle = Math.sin(time * 0.03 + item.x) * 0.2;
        ctx!.save(); ctx!.translate(10, -3); ctx!.rotate(-0.5 + clawAngle);
        ctx!.fillStyle = item.color;
        ctx!.beginPath(); ctx!.ellipse(6, 0, 5, 3, 0, 0, Math.PI*2); ctx!.fill();
        ctx!.restore();
        ctx!.save(); ctx!.translate(10, 3); ctx!.rotate(0.5 - clawAngle);
        ctx!.fillStyle = item.color;
        ctx!.beginPath(); ctx!.ellipse(6, 0, 5, 3, 0, 0, Math.PI*2); ctx!.fill();
        ctx!.restore();
        // Eyes
        ctx!.fillStyle = '#000';
        ctx!.beginPath(); ctx!.arc(-5, -5, 1.5, 0, Math.PI*2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(-3, -5, 1.5, 0, Math.PI*2); ctx!.fill();
        // Legs
        ctx!.strokeStyle = item.color; ctx!.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          const lx = -4 + i * 4;
          ctx!.beginPath(); ctx!.moveTo(lx, 6); ctx!.lineTo(lx-3, 12); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(lx, -6); ctx!.lineTo(lx-3, -12); ctx!.stroke();
        }
      } else if (item.type === 'shell') {
        ctx!.fillStyle = item.color;
        ctx!.beginPath();
        ctx!.arc(0, 0, 8, Math.PI, 0);
        ctx!.quadraticCurveTo(10, 5, 0, 10);
        ctx!.quadraticCurveTo(-10, 5, -8, 0);
        ctx!.closePath(); ctx!.fill();
        // Lines
        ctx!.strokeStyle = 'rgba(0,0,0,0.15)'; ctx!.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i/5)*Math.PI;
          ctx!.beginPath(); ctx!.moveTo(0, 2); ctx!.lineTo(Math.cos(a)*7, Math.sin(a)*7+2); ctx!.stroke();
        }
      } else if (item.type === 'coral') {
        ctx!.fillStyle = item.color;
        // Branching coral
        const branches = [[0,-12],[8,-8],[-8,-6],[4,-14],[-5,-13],[10,-4],[-10,-2]];
        for (const [bx, by] of branches) {
          ctx!.beginPath();
          ctx!.moveTo(bx*0.3, 0);
          ctx!.quadraticCurveTo(bx*0.6, by*0.5, bx, by);
          ctx!.lineWidth = 3; ctx!.strokeStyle = item.color; ctx!.lineCap = 'round'; ctx!.stroke();
          // Tips
          ctx!.beginPath(); ctx!.arc(bx, by, 2.5, 0, Math.PI*2);
          ctx!.fillStyle = item.color; ctx!.globalAlpha = 0.7; ctx!.fill(); ctx!.globalAlpha = 1;
        }
      }
      ctx!.restore();
    }

    function drawWreckage(w: Wreckage, time: number) {
      ctx!.save();
      ctx!.translate(w.x, w.y);
      ctx!.scale(w.scale, w.scale);

      if (w.type === 'chest') {
        // Chest body
        ctx!.fillStyle = '#78350f';
        ctx!.fillRect(-20, -10, 40, 20);
        // Lid
        ctx!.fillStyle = '#92400e';
        ctx!.beginPath();
        ctx!.moveTo(-20, -10);
        ctx!.quadraticCurveTo(0, -22, 20, -10);
        ctx!.fill();
        // Bands
        ctx!.fillStyle = '#b45309';
        ctx!.fillRect(-20, -2, 40, 3);
        ctx!.fillRect(-2, -12, 4, 22);
        // Lock
        ctx!.fillStyle = '#eab308';
        ctx!.beginPath(); ctx!.arc(0, 0, 3, 0, Math.PI*2); ctx!.fill();
        // Glow
        ctx!.globalAlpha = 0.15 + Math.sin(time*0.02)*0.05;
        const glow = ctx!.createRadialGradient(0,0,0,0,0,35);
        glow.addColorStop(0, '#fbbf24'); glow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx!.fillStyle = glow; ctx!.fillRect(-35,-35,70,70);
      } else if (w.type === 'anchor') {
        ctx!.strokeStyle = '#6b7280'; ctx!.lineWidth = 4; ctx!.lineCap = 'round';
        // Shaft
        ctx!.beginPath(); ctx!.moveTo(0,-30); ctx!.lineTo(0,10); ctx!.stroke();
        // Cross bar
        ctx!.beginPath(); ctx!.moveTo(-10,-20); ctx!.lineTo(10,-20); ctx!.stroke();
        // Ring
        ctx!.beginPath(); ctx!.arc(0,-30,6,0,Math.PI*2); ctx!.stroke();
        // Curved arms
        ctx!.beginPath(); ctx!.moveTo(-12,10); ctx!.quadraticCurveTo(-15,25,0,20); ctx!.quadraticCurveTo(15,25,12,10); ctx!.stroke();
      } else if (w.type === 'ship') {
        ctx!.globalAlpha = 0.3;
        // Hull
        ctx!.fillStyle = '#44403c';
        ctx!.beginPath();
        ctx!.moveTo(-80, 0);
        ctx!.lineTo(-60, 25); ctx!.lineTo(60, 25); ctx!.lineTo(80, 0);
        ctx!.lineTo(70, -5); ctx!.lineTo(-70, -5);
        ctx!.closePath(); ctx!.fill();
        // Mast
        ctx!.strokeStyle = '#57534e'; ctx!.lineWidth = 3;
        ctx!.beginPath(); ctx!.moveTo(0, -5); ctx!.lineTo(0, -60); ctx!.stroke();
        // Broken mast
        ctx!.beginPath(); ctx!.moveTo(0, -40); ctx!.lineTo(20, -55); ctx!.stroke();
        // Ribs
        ctx!.strokeStyle = '#57534e'; ctx!.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) {
          ctx!.beginPath(); ctx!.moveTo(i*18, -3); ctx!.lineTo(i*18, 22); ctx!.stroke();
        }
      }
      ctx!.restore();
    }

    function drawBubble(b: BubbleEntity, time: number) {
      const wobbleX = Math.sin(b.wobblePhase + time*0.02)*8;
      const fade = b.life/b.maxLife > 0.8 ? (1-b.life/b.maxLife)/0.2 : 1;
      ctx!.save();
      ctx!.globalAlpha = b.opacity * fade;
      ctx!.translate(b.x + wobbleX, b.y);
      ctx!.drawImage(b.img, -b.size/2, -b.size/2, b.size, b.size);
      ctx!.beginPath(); ctx!.arc(-b.size*0.15, -b.size*0.15, b.size*0.2, 0, Math.PI*2);
      ctx!.fillStyle = 'rgba(255,255,255,0.4)'; ctx!.fill();
      ctx!.restore();
    }

    function drawSeaweed(sw: SeaweedEntity, time: number) {
      const sway = Math.sin(sw.swayPhase + time*sw.swaySpeed)*sw.swayAmp;
      ctx!.save();
      ctx!.translate(sw.x, sw.y); ctx!.scale(sw.scale, sw.scale);
      ctx!.transform(1, 0, sway*0.01, 1, 0, 0);
      ctx!.drawImage(sw.img, -sw.img.width/2, -sw.img.height, sw.img.width, sw.img.height);
      ctx!.restore();
    }

    function drawLightRay(ray: LightRay, time: number) {
      const W = s.width, H = s.height;
      const sway = Math.sin(ray.phase + time*0.003*ray.speed)*30;
      const opacity = ray.opacity * (0.7+0.3*Math.sin(time*0.005+ray.phase)) * (1 - s.dayPhase*0.6);
      if (opacity < 0.005) return;
      ctx!.save(); ctx!.globalAlpha = opacity;
      const topX = ray.x+sway, topW = ray.width*0.5;
      const botX = ray.x+sway*2.5, botW = ray.width*2;
      ctx!.beginPath();
      ctx!.moveTo(topX-topW/2, 0); ctx!.lineTo(topX+topW/2, 0);
      ctx!.lineTo(botX+botW/2, H*0.85); ctx!.lineTo(botX-botW/2, H*0.85);
      ctx!.closePath();
      const grad = ctx!.createLinearGradient(topX, 0, botX, H*0.85);
      grad.addColorStop(0, '#7dd3fc'); grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(0.7, '#0ea5e9'); grad.addColorStop(1, 'rgba(14,165,233,0)');
      ctx!.fillStyle = grad; ctx!.fill(); ctx!.restore();
    }

    // ─── Main Loop ─────────────────────────────────────────────────
    function update(time: number) {
      if (!s.started) { animRef.current = requestAnimationFrame(update); return; }
      s.time = time;
      const W = s.width, H = s.height;
      const floorY = s.floorY;

      // Day/night cycle (slow)
      s.dayPhase = (Math.sin(time * 0.0002) + 1) / 2; // 0=bright, 1=dark

      // Camera transform
      ctx!.save();
      ctx!.translate(W/2, H/2);
      ctx!.scale(s.cameraZoom, s.cameraZoom);
      ctx!.translate(-W/2 + s.cameraX, -H/2 + s.cameraY);

      // ── Background gradient (shifts with day/night) ──
      const bgDay = [
        { stop: 0, color: [12,45,72] }, { stop: 0.15, color: [10,61,92] },
        { stop: 0.4, color: [6,78,110] }, { stop: 0.65, color: [5,64,85] },
        { stop: 0.8, color: [4,47,66] }, { stop: 1, color: [2,26,43] },
      ];
      const bgNight = [
        { stop: 0, color: [2,8,20] }, { stop: 0.15, color: [3,12,28] },
        { stop: 0.4, color: [4,18,35] }, { stop: 0.65, color: [3,14,28] },
        { stop: 0.8, color: [2,10,22] }, { stop: 1, color: [1,5,15] },
      ];
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, H);
      for (let i = 0; i < bgDay.length; i++) {
        const d = bgDay[i], n = bgNight[i];
        const r = Math.round(lerp(d.color[0], n.color[0], s.dayPhase));
        const g = Math.round(lerp(d.color[1], n.color[1], s.dayPhase));
        const b = Math.round(lerp(d.color[2], n.color[2], s.dayPhase));
        bgGrad.addColorStop(d.stop, `rgb(${r},${g},${b})`);
      }
      ctx!.fillStyle = bgGrad; ctx!.fillRect(-200, -200, W+400, H+400);

      // ── Background seaweed ──
      ctx!.save(); ctx!.globalAlpha = 0.15 * (1 - s.dayPhase*0.5);
      for (let i = 0; i < s.bgSeaweed.length; i++) {
        const img = s.bgSeaweed[i];
        const bx = (i/s.bgSeaweed.length)*W + Math.sin(time*0.005+i)*10;
        ctx!.save(); ctx!.translate(bx, H*0.75);
        ctx!.transform(1,0,Math.sin(time*0.008+i*1.5)*0.005,1,0,0);
        ctx!.drawImage(img, -img.width*0.6, -img.height*0.8, img.width*1.2, img.height*0.8);
        ctx!.restore();
      }
      ctx!.restore();

      // ── Background rocks ──
      ctx!.save(); ctx!.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        const rockImg = getImg('/assets/background_rock_a.png') || getImg('/assets/background_rock_b.png');
        if (rockImg) ctx!.drawImage(rockImg, W*(0.15+i*0.3)+Math.sin(i*5)*40, H*0.78, 120, 80);
      }
      ctx!.restore();

      // ── Light rays ──
      for (const ray of s.lightRays) drawLightRay(ray, time);

      // ── Back layer fish ──
      for (const f of s.fish) if (f.layer === 'back') drawFish(f, time);

      // ── Schools ──
      for (const school of s.schools) drawSchool(school, time);

      // ── Jellyfish ──
      for (const jf of s.jellyfish) drawJellyfish(jf, time);

      // ── Shark ──
      drawShark(s.shark, time);

      // ── Mid layer fish ──
      for (const f of s.fish) if (f.layer === 'mid') drawFish(f, time);

      // ── Particles / Plankton ──
      ctx!.globalCompositeOperation = 'lighter';
      for (const p of s.particles) {
        const lr = p.life/p.maxLife;
        const fade = lr>0.7?(1-lr)/0.3:lr<0.2?lr/0.2:1;
        ctx!.globalAlpha = p.opacity * fade * (0.5 + (1-s.dayPhase)*0.5);
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx!.fillStyle = p.color; ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over'; ctx!.globalAlpha = 1;

      // ── Bioluminescence ──
      for (const b of s.biolum) {
        const pulse = (Math.sin(b.phase + time*b.speed)+1)/2;
        ctx!.globalAlpha = b.maxOpacity * pulse * s.dayPhase;
        const grad = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size*4);
        grad.addColorStop(0, b.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(b.x-b.size*4, b.y-b.size*4, b.size*8, b.size*8);
      }
      ctx!.globalAlpha = 1;

      // ── Bubbles ──
      for (const b of s.bubbles) drawBubble(b, time);

      // ── Front layer fish ──
      for (const f of s.fish) if (f.layer === 'front') drawFish(f, time);

      // ── Sandy floor ──
      const floorDay = [[0,'#1a4a5e'],[0.2,'#1e5060'],[0.5,'#3d7a6a'],[0.8,'#5a8a60'],[1,'#4a7040']];
      const floorNight = [[0,'#0a1a24'],[0.2,'#0e2028'],[0.5,'#1a3028'],[0.8,'#253020'],[1,'#1e2818']];
      const floorGrad = ctx!.createLinearGradient(0, floorY, 0, H);
      for (let i = 0; i < floorDay.length; i++) {
        const dayC = floorDay[i][1], nightC = floorNight[i][1];
        floorGrad.addColorStop(floorDay[i][0] as number, s.dayPhase > 0.5 ? nightC : dayC);
      }
      ctx!.fillStyle = floorGrad;
      ctx!.beginPath(); ctx!.moveTo(-200, floorY);
      for (let x = -200; x <= W+200; x += 20) {
        ctx!.lineTo(x, floorY + Math.sin(x*0.008+time*0.001)*8 + Math.sin(x*0.015)*4);
      }
      ctx!.lineTo(W+200, H+200); ctx!.lineTo(-200, H+200); ctx!.closePath(); ctx!.fill();

      // ── Caustics on floor ──
      ctx!.save(); ctx!.globalAlpha = 0.04 * (1-s.dayPhase*0.7);
      ctx!.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const cx = (Math.sin(time*0.004+i*2.1)*0.5+0.5)*W;
        const cy = floorY + Math.cos(time*0.003+i*1.7)*15;
        const r = 30+Math.sin(time*0.006+i)*15;
        const grad = ctx!.createRadialGradient(cx,cy,0,cx,cy,r);
        grad.addColorStop(0,'#67e8f9'); grad.addColorStop(1,'rgba(103,232,249,0)');
        ctx!.fillStyle = grad; ctx!.fillRect(cx-r,cy-r,r*2,r*2);
      }
      ctx!.restore();

      // ── Terrain tiles ──
      ctx!.save();
      for (let i = 0; i < s.terrainTop.length; i++) {
        const tx = (i/s.terrainTop.length)*W;
        const und = Math.sin(tx*0.008+time*0.001)*8+Math.sin(tx*0.015)*4;
        ctx!.globalAlpha = 0.6*(1-s.dayPhase*0.4);
        ctx!.drawImage(s.terrainTop[i], tx, floorY+und-5, s.terrainTop[i].width*1.2, s.terrainTop[i].height*1.2);
      }
      ctx!.restore();

      // ── Wreckage ──
      for (const w of s.wreckage) drawWreckage(w, time);

      // ── Rocks ──
      for (const r of s.rocks) {
        ctx!.save();
        ctx!.translate(r.x, floorY + Math.sin(r.x*0.008)*8 - 10);
        ctx!.scale(r.scale, r.scale);
        ctx!.drawImage(r.img, 0, 0, r.w, r.h);
        ctx!.restore();
      }

      // ── Floor items ──
      for (const item of s.floorItems) drawFloorItem(item, time);

      // ── Seaweed ──
      for (const sw of s.seaweed) drawSeaweed(sw, time);

      // ── Food pellets ──
      for (const food of s.food) {
        if (food.eaten) continue;
        ctx!.save();
        ctx!.globalAlpha = 0.8;
        ctx!.fillStyle = '#fbbf24';
        ctx!.beginPath(); ctx!.arc(food.x, food.y, food.size, 0, Math.PI*2); ctx!.fill();
        ctx!.fillStyle = '#f59e0b';
        ctx!.beginPath(); ctx!.arc(food.x, food.y, food.size*0.6, 0, Math.PI*2); ctx!.fill();
        ctx!.restore();
      }

      // ── Ripples ──
      for (const r of s.ripples) {
        ctx!.save();
        ctx!.globalAlpha = r.opacity * (1 - r.radius/r.maxRadius);
        ctx!.beginPath(); ctx!.arc(r.x, r.y, r.radius, 0, Math.PI*2);
        ctx!.strokeStyle = 'rgba(150,220,255,0.6)'; ctx!.lineWidth = 2; ctx!.stroke();
        ctx!.restore();
      }

      // ── Bubble trail ──
      ctx!.globalCompositeOperation = 'lighter';
      for (const bt of s.bubbleTrail) {
        ctx!.globalAlpha = bt.opacity * (1 - bt.life/40);
        ctx!.beginPath(); ctx!.arc(bt.x, bt.y, bt.size, 0, Math.PI*2);
        ctx!.fillStyle = '#7dd3fc'; ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over'; ctx!.globalAlpha = 1;

      // ── Depth fog ──
      const fogAlpha = 0.05 + s.dayPhase * 0.15;
      const fogGrad = ctx!.createLinearGradient(0, H*0.5, 0, H);
      fogGrad.addColorStop(0, 'rgba(2,15,30,0)');
      fogGrad.addColorStop(1, `rgba(2,15,30,${fogAlpha})`);
      ctx!.fillStyle = fogGrad; ctx!.fillRect(-200, -200, W+400, H+400);

      ctx!.restore(); // end camera transform

      // ── Vignette (screen space) ──
      const vigGrad = ctx!.createRadialGradient(W/2, H/2, W*0.2, W/2, H/2, W*0.75);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, `rgba(0,8,20,${0.4+s.dayPhase*0.3})`);
      ctx!.fillStyle = vigGrad; ctx!.fillRect(0, 0, W, H);

      // ── Water surface shimmer ──
      ctx!.save();
      const surfGrad = ctx!.createLinearGradient(0, 0, 0, 40);
      surfGrad.addColorStop(0, `rgba(120,210,255,${0.12*(1-s.dayPhase*0.7)})`);
      surfGrad.addColorStop(1, 'rgba(120,210,255,0)');
      ctx!.fillStyle = surfGrad; ctx!.fillRect(0, 0, W, 40);
      ctx!.beginPath(); ctx!.moveTo(0, 3);
      for (let x = 0; x <= W; x += 8) {
        ctx!.lineTo(x, 3+Math.sin(x*0.02+time*0.015)*2+Math.sin(x*0.035+time*0.025)*1);
      }
      ctx!.strokeStyle = `rgba(150,220,255,${0.15*(1-s.dayPhase*0.5)})`; ctx!.lineWidth = 2; ctx!.stroke();
      ctx!.restore();

      // ── Mouse glow ──
      if (s.mouseX > 0 && s.mouseY > 0) {
        const mgGrad = ctx!.createRadialGradient(s.mouseX, s.mouseY, 0, s.mouseX, s.mouseY, 180);
        mgGrad.addColorStop(0, `rgba(100,210,255,${0.06*(1-s.dayPhase*0.5)})`);
        mgGrad.addColorStop(1, 'rgba(100,210,255,0)');
        ctx!.fillStyle = mgGrad; ctx!.fillRect(s.mouseX-180, s.mouseY-180, 360, 360);
      }

      // ─── Update Physics ──────────────────────────────────────────

      // Fish
      for (const f of s.fish) {
        if (f.caught) { f.catchAnim--; continue; }
        f.x += f.vx; f.y += f.vy + Math.sin(f.wobblePhase+time*f.wobbleSpeed)*0.15;

        // Flee from ripples
        if (f.fleeing) { f.fleeTimer--; if (f.fleeTimer <= 0) f.fleeing = false; }

        // Shark avoidance
        if (s.shark.active) {
          const sd = dist(f.x, f.y, s.shark.x, s.shark.y);
          if (sd < 200 && sd > 0) {
            const force = (200-sd)/200 * 1.5;
            f.vx += ((f.x-s.shark.x)/sd)*force;
            f.vy += ((f.y-s.shark.y)/sd)*force;
            f.fleeing = true; f.fleeTimer = 90;
          }
        }

        // Food attraction
        const ui = uiRef.current;
        if (ui.mode === 'feed') {
          for (const food of s.food) {
            if (food.eaten) continue;
            const fd = dist(f.x, f.y, food.x, food.y);
            if (fd < 100 && fd > 0) {
              f.vx += ((food.x-f.x)/fd)*0.15;
              f.vy += ((food.y-f.y)/fd)*0.15;
              if (fd < 10) { food.eaten = true; setUiState(p => ({...p, score: p.score+5})); }
            }
          }
        }

        // Mouse avoidance (front fish)
        if (f.layer === 'front' && s.mouseX > 0 && !s.isDragging) {
          const dx = f.x-s.mouseX, dy = f.y-s.mouseY;
          const d = Math.sqrt(dx*dx+dy*dy);
          if (d < 120 && d > 0) {
            const force = (120-d)/120*0.5;
            f.vx += (dx/d)*force; f.vy += (dy/d)*force;
          }
        }

        const maxSpd = f.layer==='back'?1.2:f.layer==='mid'?2:3;
        const spd = Math.sqrt(f.vx*f.vx+f.vy*f.vy);
        if (spd > maxSpd) { f.vx = (f.vx/spd)*maxSpd; f.vy = (f.vy/spd)*maxSpd; }
        f.vy *= 0.98;
        const margin = 100;
        if (f.vx > 0 && f.x > W+margin) f.x = -margin;
        if (f.vx < 0 && f.x < -margin) f.x = W+margin;
        if (f.y < H*0.05) f.vy = Math.abs(f.vy)+0.1;
        if (f.y > H*0.72) f.vy = -Math.abs(f.vy)-0.1;
        f.flip = f.vx < 0;
      }

      // Shark
      if (!s.shark.active) {
        s.shark.cooldown--;
        if (s.shark.cooldown <= 0) {
          s.shark.active = true;
          s.shark.x = -200;
          s.shark.y = rand(H*0.2, H*0.6);
          s.shark.vx = rand(2, 3.5);
          s.shark.vy = rand(-0.2, 0.2);
          s.shark.enterPhase = 0;
        }
      } else {
        s.shark.x += s.shark.vx;
        s.shark.y += s.shark.vy + Math.sin(time*0.01)*0.3;
        if (s.shark.y < H*0.1) s.shark.vy = Math.abs(s.shark.vy);
        if (s.shark.y > H*0.65) s.shark.vy = -Math.abs(s.shark.vy);
        if (s.shark.x > W + 300) {
          s.shark.active = false;
          s.shark.cooldown = randInt(500, 1200);
        }
      }

      // Schools
      for (const school of s.schools) {
        school.x += school.vx; school.y += school.vy;
        if (school.x > W+100 || school.x < -100) school.vx *= -1;
        if (school.y > H*0.6 || school.y < H*0.05) school.vy *= -1;
        // Flee from shark
        if (s.shark.active) {
          const sd = dist(school.x, school.y, s.shark.x, s.shark.y);
          if (sd < 250) {
            school.vx += ((school.x-s.shark.x)/(sd||1))*0.3;
            school.vy += ((school.y-s.shark.y)/(sd||1))*0.3;
          }
        }
        school.vx *= 0.99; school.vy *= 0.99;
      }

      // Bubbles
      for (let i = s.bubbles.length-1; i >= 0; i--) {
        const b = s.bubbles[i]; b.y -= b.vy; b.wobblePhase += 0.02; b.life++;
        if (b.y < -50 || b.life > b.maxLife) { s.bubbles.splice(i,1); spawnBubble(); }
      }

      // Particles
      for (const p of s.particles) {
        p.x += p.vx+Math.sin(time*0.005+p.life*0.01)*0.05;
        p.y += p.vy+Math.cos(time*0.004+p.life*0.008)*0.03;
        p.life++;
        if (p.life>p.maxLife||p.x<-10||p.x>W+10||p.y<-10||p.y>H+10) {
          p.x=rand(0,W); p.y=rand(0,H); p.life=0; p.maxLife=rand(400,800);
        }
      }

      // Jellyfish
      for (const jf of s.jellyfish) {
        jf.x += jf.vx+Math.sin(time*0.005+jf.pulsePhase)*0.2;
        jf.y += jf.vy+Math.sin(time*0.008+jf.pulsePhase*2)*0.15;
        jf.pulsePhase += 0.01;
        if (jf.y < -60) { jf.y = H*0.5; jf.x = rand(50,W-50); }
        if (jf.x < -50) jf.x = W+30; if (jf.x > W+50) jf.x = -30;
      }

      // Ripples
      for (let i = s.ripples.length-1; i >= 0; i--) {
        const r = s.ripples[i]; r.radius += 3; r.life++;
        if (r.radius >= r.maxRadius) s.ripples.splice(i,1);
      }

      // Food
      for (let i = s.food.length-1; i >= 0; i--) {
        const f = s.food[i]; f.y += f.vy; f.life++;
        if (f.eaten || f.life > 600 || f.y > H) s.food.splice(i,1);
      }

      // Floor items (crabs move)
      for (const item of s.floorItems) {
        if (item.type === 'crab') {
          item.moveTimer++;
          if (item.moveTimer > 120) {
            item.x += item.moveDir * 0.3;
            item.moveTimer = 0;
            if (Math.random() > 0.8) item.moveDir *= -1;
          }
        }
      }

      // Bubble trail
      for (let i = s.bubbleTrail.length-1; i >= 0; i--) {
        s.bubbleTrail[i].life++;
        s.bubbleTrail[i].y -= 0.5;
        if (s.bubbleTrail[i].life > 40) s.bubbleTrail.splice(i,1);
      }

      // Quiz mode auto-advance
      const ui = uiRef.current;
      if (ui.mode === 'quiz' && ui.quizPhase === 'result') {
        // auto reset handled by React state
      }

      // Find skeleton timer
      if (ui.mode === 'findSkeleton' && !ui.findSkeletonFound) {
        // Timer managed in React
      }

      animRef.current = requestAnimationFrame(update);
    }

    loadAll();
    animRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (s.audioCtx) s.audioCtx.close();
    };
  }, [loadImg]);

  // ─── Game Mode Handlers ────────────────────────────────────────────
  const startQuiz = useCallback(() => {
    const skeletonFish = stateRef.current.fish.filter(f => f.skeletonImg);
    const target = skeletonFish.length > 0 ? randInt(3, Math.min(12, skeletonFish.length + 3)) : 5;
    setUiState(prev => ({
      ...prev, mode: 'quiz', quizTarget: target, quizAnswer: 0,
      quizPhase: 'question', quizCorrect: false, showUI: false,
    }));
  }, []);

  const submitQuiz = useCallback(() => {
    setUiState(prev => {
      const count = prev.quizAnswer;
      const correct = Math.abs(count - prev.quizTarget) <= 1;
      return { ...prev, quizPhase: 'result', quizCorrect: correct, score: prev.score + (correct ? 20 : -5) };
    });
  }, []);

  const startFindSkeleton = useCallback(() => {
    const s = stateRef.current;
    const skeletonFish = s.fish.filter(f => f.skeletonImg && !f.caught);
    if (skeletonFish.length === 0) return;
    const target = skeletonFish[randInt(0, skeletonFish.length)];
    setUiState(prev => ({
      ...prev, mode: 'findSkeleton',
      findSkeletonTarget: { x: target.x, y: target.y, fishIdx: s.fish.indexOf(target) },
      findSkeletonFound: false, findSkeletonTimer: 30, showUI: false,
    }));
  }, []);

  const startPhotography = useCallback(() => {
    setUiState(prev => ({ ...prev, mode: 'photography', photos: [], showUI: false }));
  }, []);

  const startFeed = useCallback(() => {
    setUiState(prev => ({ ...prev, mode: 'feed', showUI: false }));
  }, []);

  const backToObserve = useCallback(() => {
    setUiState(prev => ({ ...prev, mode: 'observe', showUI: false }));
  }, []);

  const showMenu = useCallback(() => {
    setUiState(prev => ({ ...prev, showUI: true }));
  }, []);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#041529' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-none"
      />

      {/* Mode indicator */}
      {uiState.mode !== 'observe' && (
        <div className="absolute top-3 left-3 z-10">
          <div className="rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-sm border border-cyan-500/20">
            {uiState.mode === 'quiz' && 'Fish Counting Quiz'}
            {uiState.mode === 'findSkeleton' && 'Find the Skeleton Fish!'}
            {uiState.mode === 'photography' && 'Photography Mode — Click fish to capture'}
            {uiState.mode === 'feed' && 'Feed Mode — Click to drop food'}
          </div>
        </div>
      )}

      {/* Score */}
      <div className="absolute top-3 right-3 z-10">
        <div className="rounded-lg bg-black/40 px-3 py-1.5 text-sm font-bold text-amber-400 backdrop-blur-sm border border-amber-500/20">
          Score: {uiState.score}
        </div>
      </div>

      {/* Menu button */}
      <button
        onClick={showMenu}
        className="absolute bottom-4 left-4 z-10 rounded-full bg-black/40 p-3 text-white/70 backdrop-blur-sm border border-white/10 hover:bg-black/60 hover:text-white transition-all cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/>
        </svg>
      </button>

      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-white/30">
        Scroll to zoom · Drag to pan
      </div>

      {/* Menu panel */}
      {uiState.showUI && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-slate-900/90 p-6 border border-cyan-500/20 shadow-2xl max-w-xs w-full mx-4">
            <h2 className="text-lg font-bold text-cyan-300 mb-4 text-center">Deep Ocean</h2>
            <div className="space-y-2">
              <button onClick={() => { setUiState(p=>({...p, showUI:false, mode:'observe'})); }} className="w-full rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 px-4 py-2.5 text-sm text-cyan-200 border border-cyan-500/20 transition cursor-pointer">Observe</button>
              <button onClick={() => { setUiState(p=>({...p, showUI:false})); startQuiz(); }} className="w-full rounded-lg bg-purple-600/20 hover:bg-purple-600/40 px-4 py-2.5 text-sm text-purple-200 border border-purple-500/20 transition cursor-pointer">Fish Counting Quiz</button>
              <button onClick={() => { setUiState(p=>({...p, showUI:false})); startFindSkeleton(); }} className="w-full rounded-lg bg-amber-600/20 hover:bg-amber-600/40 px-4 py-2.5 text-sm text-amber-200 border border-amber-500/20 transition cursor-pointer">Find the Skeleton Fish</button>
              <button onClick={() => { setUiState(p=>({...p, showUI:false})); startPhotography(); }} className="w-full rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 px-4 py-2.5 text-sm text-emerald-200 border border-emerald-500/20 transition cursor-pointer">Photography Mode</button>
              <button onClick={() => { setUiState(p=>({...p, showUI:false})); startFeed(); }} className="w-full rounded-lg bg-rose-600/20 hover:bg-rose-600/40 px-4 py-2.5 text-sm text-rose-200 border border-rose-500/20 transition cursor-pointer">Feed the Fish</button>
            </div>
            <button onClick={() => setUiState(p=>({...p, showUI:false}))} className="w-full mt-3 rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-white/50 transition cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Quiz UI */}
      {uiState.mode === 'quiz' && uiState.quizPhase === 'question' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-xl bg-black/60 px-5 py-3 backdrop-blur-sm border border-purple-500/20">
          <span className="text-sm text-purple-200">How many fish with skeletons do you see?</span>
          <button onClick={() => setUiState(p => ({...p, quizAnswer: Math.max(0, p.quizAnswer-1)}))} className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-200 font-bold hover:bg-purple-600/50 transition cursor-pointer">-</button>
          <span className="text-xl font-bold text-white w-8 text-center">{uiState.quizAnswer}</span>
          <button onClick={() => setUiState(p => ({...p, quizAnswer: p.quizAnswer+1}))} className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-200 font-bold hover:bg-purple-600/50 transition cursor-pointer">+</button>
          <button onClick={submitQuiz} className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-500 transition cursor-pointer">Submit</button>
        </div>
      )}

      {uiState.mode === 'quiz' && uiState.quizPhase === 'result' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 rounded-xl bg-black/60 px-6 py-4 backdrop-blur-sm border border-purple-500/20 text-center">
          <p className="text-lg font-bold mb-1" style={{ color: uiState.quizCorrect ? '#4ade80' : '#f87171' }}>
            {uiState.quizCorrect ? 'Correct!' : `Wrong! Answer: ~${uiState.quizTarget}`}
          </p>
          <div className="flex gap-2 mt-3 justify-center">
            <button onClick={startQuiz} className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-500 transition cursor-pointer">Next Question</button>
            <button onClick={backToObserve} className="rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white/70 hover:bg-white/20 transition cursor-pointer">Back</button>
          </div>
        </div>
      )}

      {/* Find skeleton result */}
      {uiState.mode === 'findSkeleton' && uiState.findSkeletonFound && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 rounded-xl bg-black/60 px-6 py-4 backdrop-blur-sm border border-amber-500/20 text-center">
          <p className="text-lg font-bold text-amber-400">Found it! +25 points</p>
          <div className="flex gap-2 mt-3 justify-center">
            <button onClick={startFindSkeleton} className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm text-white hover:bg-amber-500 transition cursor-pointer">Find Another</button>
            <button onClick={backToObserve} className="rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white/70 hover:bg-white/20 transition cursor-pointer">Back</button>
          </div>
        </div>
      )}

      {/* Photography gallery */}
      {uiState.mode === 'photography' && uiState.photos.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {uiState.photos.slice(-5).map((p, i) => (
            <div key={i} className="relative group">
              <img src={p.dataUrl} alt={p.name} className="w-16 h-12 rounded border border-emerald-500/30 object-cover" />
              <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/60 text-center rounded-b">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}