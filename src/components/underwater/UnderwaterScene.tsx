'use client';

import { useEffect, useRef, useCallback } from 'react';

// ─── Asset Map ───────────────────────────────────────────────────────
const FISH = [
  { src: '/assets/fish_blue.png', w: 48, h: 32 },
  { src: '/assets/fish_brown.png', w: 52, h: 34 },
  { src: '/assets/fish_green.png', w: 46, h: 30 },
  { src: '/assets/fish_grey.png', w: 50, h: 32 },
  { src: '/assets/fish_orange.png', w: 54, h: 34 },
  { src: '/assets/fish_pink.png', w: 44, h: 28 },
  { src: '/assets/fish_red.png', w: 56, h: 36 },
  { src: '/assets/fish_grey_long_a.png', w: 72, h: 26 },
  { src: '/assets/fish_grey_long_b.png', w: 68, h: 28 },
];

const SKELETON_FISH = [
  { src: '/assets/fish_blue_skeleton.png', w: 48, h: 32 },
  { src: '/assets/fish_green_skeleton.png', w: 46, h: 30 },
  { src: '/assets/fish_orange_skeleton.png', w: 54, h: 34 },
  { src: '/assets/fish_pink_skeleton.png', w: 44, h: 28 },
  { src: '/assets/fish_red_skeleton.png', w: 56, h: 36 },
  { src: '/assets/fish_blue_skeleton_outline.png', w: 48, h: 32 },
  { src: '/assets/fish_green_skeleton_outline.png', w: 46, h: 30 },
  { src: '/assets/fish_orange_skeleton_outline.png', w: 54, h: 34 },
  { src: '/assets/fish_pink_skeleton_outline.png', w: 44, h: 28 },
  { src: '/assets/fish_red_skeleton_outline.png', w: 56, h: 36 },
];

const SEAWEED_GREEN = [
  '/assets/seaweed_green_a.png',
  '/assets/seaweed_green_b.png',
  '/assets/seaweed_green_c.png',
  '/assets/seaweed_green_d.png',
];

const SEAWEED_ORANGE = [
  '/assets/seaweed_orange_a.png',
  '/assets/seaweed_orange_b.png',
];

const SEAWEED_PINK = [
  '/assets/seaweed_pink_a.png',
  '/assets/seaweed_pink_b.png',
  '/assets/seaweed_pink_c.png',
  '/assets/seaweed_pink_d.png',
];

const SEAWEED_GRASS = [
  '/assets/seaweed_grass_a.png',
  '/assets/seaweed_grass_b.png',
];

const BUBBLES = [
  '/assets/bubble_a.png',
  '/assets/bubble_b.png',
  '/assets/bubble_c.png',
];

const ROCKS = [
  { src: '/assets/rock_a.png', w: 80, h: 50 },
  { src: '/assets/rock_b.png', w: 70, h: 45 },
];

const TERRAIN_TOP = [
  '/assets/terrain_sand_top_a.png',
  '/assets/terrain_sand_top_b.png',
  '/assets/terrain_sand_top_c.png',
  '/assets/terrain_sand_top_d.png',
  '/assets/terrain_sand_top_e.png',
  '/assets/terrain_sand_top_f.png',
  '/assets/terrain_sand_top_g.png',
  '/assets/terrain_sand_top_h.png',
];

const TERRAIN_SOLID = [
  '/assets/terrain_sand_a.png',
  '/assets/terrain_sand_b.png',
  '/assets/terrain_sand_c.png',
  '/assets/terrain_sand_d.png',
];

const BG_SEAWEED = [
  '/assets/background_seaweed_a.png',
  '/assets/background_seaweed_b.png',
  '/assets/background_seaweed_c.png',
  '/assets/background_seaweed_d.png',
  '/assets/background_seaweed_e.png',
  '/assets/background_seaweed_f.png',
  '/assets/background_seaweed_g.png',
  '/assets/background_seaweed_h.png',
];

// ─── Types ───────────────────────────────────────────────────────────
interface FishEntity {
  x: number; y: number;
  vx: number; vy: number;
  img: HTMLImageElement;
  w: number; h: number;
  scale: number;
  flip: boolean;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  tailPhase: number;
  layer: 'mid' | 'back' | 'front';
  opacity: number;
}

interface BubbleEntity {
  x: number; y: number;
  vy: number;
  size: number;
  img: HTMLImageElement;
  wobblePhase: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface SeaweedEntity {
  x: number; y: number;
  img: HTMLImageElement;
  scale: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
}

interface ParticleEntity {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
}

interface LightRay {
  x: number;
  width: number;
  opacity: number;
  speed: number;
  phase: number;
}

interface JellyfishEntity {
  x: number; y: number;
  vx: number; vy: number;
  pulsePhase: number;
  scale: number;
  color: string;
  opacity: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ─── Main Component ──────────────────────────────────────────────────
export default function UnderwaterScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<{
    fish: FishEntity[];
    bubbles: BubbleEntity[];
    seaweed: SeaweedEntity[];
    particles: ParticleEntity[];
    lightRays: LightRay[];
    jellyfish: JellyfishEntity[];
    terrainTop: HTMLImageElement[];
    terrainSolid: HTMLImageElement[];
    bgSeaweed: HTMLImageElement[];
    rocks: { img: HTMLImageElement; x: number; w: number; h: number; scale: number }[];
    bgGradient: CanvasGradient | null;
    time: number;
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
    imagesLoaded: number;
    totalImages: number;
    started: boolean;
    dpr: number;
  }>({
    fish: [], bubbles: [], seaweed: [], particles: [],
    lightRays: [], jellyfish: [],
    terrainTop: [], terrainSolid: [], bgSeaweed: [], rocks: [],
    bgGradient: null, time: 0,
    mouseX: 0, mouseY: 0, width: 0, height: 0,
    imagesLoaded: 0, totalImages: 0, started: false, dpr: 1,
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
      ...FISH.map(f => f.src),
      ...SKELETON_FISH.map(f => f.src),
      ...SEAWEED_GREEN, ...SEAWEED_ORANGE, ...SEAWEED_PINK, ...SEAWEED_GRASS,
      ...BUBBLES, ...ROCKS.map(r => r.src),
      ...TERRAIN_TOP, ...TERRAIN_SOLID,
      ...BG_SEAWEED,
    ];
    s.totalImages = allSources.length;

    const imageMap = new Map<string, HTMLImageElement>();

    async function loadAll() {
      const promises = allSources.map(async (src) => {
        try {
          const img = await loadImg(src);
          imageMap.set(src, img);
          s.imagesLoaded++;
        } catch {
          s.imagesLoaded++;
        }
      });
      await Promise.all(promises);
      initScene();
    }

    function getImg(src: string): HTMLImageElement | undefined {
      return imageMap.get(src);
    }

    // ─── Init Scene ────────────────────────────────────────────────
    function initScene() {
      const W = s.width;
      const H = s.height;

      // Fish
      const allFishDefs = [...FISH, ...SKELETON_FISH];
      s.fish = [];
      for (let i = 0; i < 35; i++) {
        const def = allFishDefs[randInt(0, allFishDefs.length)];
        const img = getImg(def.src);
        if (!img) continue;
        const layer = i < 8 ? 'back' as const : i < 25 ? 'mid' as const : 'front' as const;
        const scale = layer === 'back' ? rand(0.5, 0.7) : layer === 'mid' ? rand(0.8, 1.2) : rand(1.1, 1.6);
        const goRight = Math.random() > 0.5;
        s.fish.push({
          x: rand(-100, W + 100),
          y: rand(H * 0.08, H * 0.72),
          vx: (goRight ? 1 : -1) * rand(0.3, layer === 'back' ? 1.0 : 2.2) * (layer === 'back' ? 0.5 : layer === 'mid' ? 0.8 : 1),
          vy: rand(-0.1, 0.1),
          img, w: def.w, h: def.h,
          scale, flip: !goRight,
          wobblePhase: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.01, 0.03),
          wobbleAmp: rand(0.3, 1.5),
          tailPhase: rand(0, Math.PI * 2),
          layer,
          opacity: layer === 'back' ? rand(0.3, 0.5) : layer === 'mid' ? rand(0.6, 0.85) : rand(0.8, 1),
        });
      }

      // Bubbles
      s.bubbles = [];
      for (let i = 0; i < 40; i++) spawnBubble(true);

      // Seaweed
      s.seaweed = [];
      const allSeaweedSrcs = [...SEAWEED_GREEN, ...SEAWEED_ORANGE, ...SEAWEED_PINK, ...SEAWEED_GRASS];
      for (let i = 0; i < 22; i++) {
        const src = allSeaweedSrcs[randInt(0, allSeaweedSrcs.length)];
        const img = getImg(src);
        if (!img) continue;
        s.seaweed.push({
          x: rand(10, W - 10),
          y: H - rand(0, 30),
          img,
          scale: rand(0.8, 1.8),
          swayPhase: rand(0, Math.PI * 2),
          swaySpeed: rand(0.008, 0.02),
          swayAmp: rand(3, 12),
        });
      }
      // Sort seaweed by y so ones further back render first
      s.seaweed.sort((a, b) => a.scale - b.scale);

      // Background seaweed
      s.bgSeaweed = [];
      for (const src of BG_SEAWEED) {
        const img = getImg(src);
        if (img) s.bgSeaweed.push(img);
      }

      // Rocks
      s.rocks = [];
      for (let i = 0; i < 6; i++) {
        const rDef = ROCKS[randInt(0, ROCKS.length)];
        const img = getImg(rDef.src);
        if (!img) continue;
        s.rocks.push({
          img, x: rand(20, W - 80),
          w: rDef.w, h: rDef.h,
          scale: rand(0.8, 1.6),
        });
      }
      s.rocks.sort((a, b) => a.scale - b.scale);

      // Terrain
      s.terrainTop = [];
      for (const src of TERRAIN_TOP) {
        const img = getImg(src);
        if (img) s.terrainTop.push(img);
      }
      s.terrainSolid = [];
      for (const src of TERRAIN_SOLID) {
        const img = getImg(src);
        if (img) s.terrainSolid.push(img);
      }

      // Light rays
      s.lightRays = [];
      for (let i = 0; i < 7; i++) {
        s.lightRays.push({
          x: rand(W * 0.05, W * 0.95),
          width: rand(40, 120),
          opacity: rand(0.02, 0.07),
          speed: rand(0.1, 0.3),
          phase: rand(0, Math.PI * 2),
        });
      }

      // Jellyfish
      s.jellyfish = [];
      const jellyColors = [
        'rgba(180, 120, 255, 0.25)',
        'rgba(120, 200, 255, 0.2)',
        'rgba(255, 150, 200, 0.2)',
        'rgba(100, 255, 200, 0.18)',
      ];
      for (let i = 0; i < 4; i++) {
        s.jellyfish.push({
          x: rand(50, W - 50),
          y: rand(H * 0.05, H * 0.45),
          vx: rand(-0.15, 0.15),
          vy: rand(-0.3, -0.05),
          pulsePhase: rand(0, Math.PI * 2),
          scale: rand(0.6, 1.2),
          color: jellyColors[i % jellyColors.length],
          opacity: rand(0.15, 0.35),
        });
      }

      // Particles (plankton)
      s.particles = [];
      for (let i = 0; i < 60; i++) {
        s.particles.push({
          x: rand(0, W), y: rand(0, H),
          vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1),
          size: rand(1, 3),
          opacity: rand(0.15, 0.5),
          life: rand(0, 500),
          maxLife: rand(400, 800),
          color: Math.random() > 0.5 ? '#7dd3fc' : '#a7f3d0',
        });
      }

      s.started = true;
    }

    function spawnBubble(initial = false) {
      const W = s.width;
      const H = s.height;
      const bubbleDef = BUBBLES[randInt(0, BUBBLES.length)];
      const img = getImg(bubbleDef);
      if (!img) return;
      const size = rand(8, 28);
      s.bubbles.push({
        x: rand(20, W - 20),
        y: initial ? rand(H * 0.1, H * 0.85) : H + rand(10, 50),
        vy: rand(0.3, 1.2),
        size,
        img,
        wobblePhase: rand(0, Math.PI * 2),
        opacity: rand(0.3, 0.7),
        life: 0,
        maxLife: rand(300, 700),
      });
    }

    // ─── Resize ────────────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      s.dpr = dpr;
      const W = window.innerWidth;
      const H = window.innerHeight;
      s.width = W;
      s.height = H;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + 'px';
      canvas!.style.height = H + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // ─── Mouse ─────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
    }
    window.addEventListener('mousemove', onMouseMove);

    // ─── Draw Jellyfish ────────────────────────────────────────────
    function drawJellyfish(jf: JellyfishEntity, time: number) {
      const pulse = Math.sin(jf.pulsePhase + time * 0.02) * 0.15 + 1;
      const w = 40 * jf.scale * pulse;
      const h = 25 * jf.scale / pulse;

      ctx!.save();
      ctx!.globalAlpha = jf.opacity;
      ctx!.translate(jf.x, jf.y);

      // Bell (dome)
      ctx!.beginPath();
      ctx!.ellipse(0, 0, w, h, 0, Math.PI, 0);
      const grad = ctx!.createRadialGradient(0, -h * 0.3, 0, 0, 0, w);
      const baseColor = jf.color.replace(/[\d.]+\)$/, '');
      grad.addColorStop(0, baseColor + '0.4)');
      grad.addColorStop(0.6, baseColor + '0.15)');
      grad.addColorStop(1, baseColor + '0.05)');
      ctx!.fillStyle = grad;
      ctx!.fill();

      // Inner glow
      ctx!.beginPath();
      ctx!.ellipse(0, -h * 0.2, w * 0.5, h * 0.4, 0, Math.PI, 0);
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx!.fill();

      // Tentacles
      const tentCount = 5;
      for (let t = 0; t < tentCount; t++) {
        const tx = lerp(-w * 0.7, w * 0.7, t / (tentCount - 1));
        const tentLen = rand(20, 45) * jf.scale;
        ctx!.beginPath();
        ctx!.moveTo(tx, 2);
        for (let seg = 0; seg < 6; seg++) {
          const segY = 2 + (seg / 6) * tentLen;
          const wave = Math.sin(time * 0.015 + t * 1.5 + seg * 0.8) * (4 + seg * 1.5) * jf.scale;
          ctx!.lineTo(tx + wave, segY);
        }
        ctx!.strokeStyle = baseColor + '0.2)';
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      ctx!.restore();
    }

    // ─── Draw Fish ─────────────────────────────────────────────────
    function drawFish(f: FishEntity, time: number) {
      const wobbleY = Math.sin(f.wobblePhase + time * f.wobbleSpeed) * f.wobbleAmp;
      const tailWag = Math.sin(f.tailPhase + time * 0.08) * 0.05;

      ctx!.save();
      ctx!.globalAlpha = f.opacity;
      ctx!.translate(f.x, f.y + wobbleY);
      ctx!.scale(f.flip ? -f.scale : f.scale, f.scale + tailWag);

      // Subtle shadow under fish
      ctx!.shadowColor = 'rgba(0,0,0,0.15)';
      ctx!.shadowBlur = 6;
      ctx!.shadowOffsetY = 3;

      ctx!.drawImage(f.img, -f.w / 2, -f.h / 2, f.w, f.h);
      ctx!.restore();
    }

    // ─── Draw Bubble ───────────────────────────────────────────────
    function drawBubble(b: BubbleEntity, time: number) {
      const wobbleX = Math.sin(b.wobblePhase + time * 0.02) * 8;
      const lifeRatio = b.life / b.maxLife;
      const fadeOpacity = lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1;

      ctx!.save();
      ctx!.globalAlpha = b.opacity * fadeOpacity;
      ctx!.translate(b.x + wobbleX, b.y);

      // Shimmer highlight
      ctx!.drawImage(b.img, -b.size / 2, -b.size / 2, b.size, b.size);

      // Specular highlight
      ctx!.beginPath();
      ctx!.arc(-b.size * 0.15, -b.size * 0.15, b.size * 0.2, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx!.fill();

      ctx!.restore();
    }

    // ─── Draw Seaweed ──────────────────────────────────────────────
    function drawSeaweed(sw: SeaweedEntity, time: number) {
      const sway = Math.sin(sw.swayPhase + time * sw.swaySpeed) * sw.swayAmp;

      ctx!.save();
      ctx!.translate(sw.x, sw.y);
      ctx!.scale(sw.scale, sw.scale);

      // Shear transform for sway effect
      ctx!.transform(1, 0, sway * 0.01, 1, 0, 0);

      ctx!.drawImage(sw.img, -sw.img.width / 2, -sw.img.height, sw.img.width, sw.img.height);
      ctx!.restore();
    }

    // ─── Draw Light Ray ────────────────────────────────────────────
    function drawLightRay(ray: LightRay, time: number) {
      const W = s.width;
      const H = s.height;
      const sway = Math.sin(ray.phase + time * 0.003 * ray.speed) * 30;
      const opacity = ray.opacity * (0.7 + 0.3 * Math.sin(time * 0.005 + ray.phase));

      ctx!.save();
      ctx!.globalAlpha = opacity;
      ctx!.beginPath();
      const topX = ray.x + sway;
      const topW = ray.width * 0.5;
      const botX = ray.x + sway * 2.5;
      const botW = ray.width * 2;
      ctx!.moveTo(topX - topW / 2, 0);
      ctx!.lineTo(topX + topW / 2, 0);
      ctx!.lineTo(botX + botW / 2, H * 0.85);
      ctx!.lineTo(botX - botW / 2, H * 0.85);
      ctx!.closePath();

      const grad = ctx!.createLinearGradient(topX, 0, botX, H * 0.85);
      grad.addColorStop(0, '#7dd3fc');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(0.7, '#0ea5e9');
      grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx!.fillStyle = grad;
      ctx!.fill();
      ctx!.restore();
    }

    // ─── Draw Caustics (floor light pattern) ───────────────────────
    function drawCaustics(time: number) {
      const W = s.width;
      const H = s.height;
      const floorY = H * 0.82;

      ctx!.save();
      ctx!.globalAlpha = 0.04;
      ctx!.globalCompositeOperation = 'lighter';

      for (let i = 0; i < 12; i++) {
        const cx = (Math.sin(time * 0.004 + i * 2.1) * 0.5 + 0.5) * W;
        const cy = floorY + Math.cos(time * 0.003 + i * 1.7) * 15;
        const r = 30 + Math.sin(time * 0.006 + i) * 15;

        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#67e8f9');
        grad.addColorStop(1, 'rgba(103, 232, 249, 0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      ctx!.restore();
    }

    // ─── Main Loop ─────────────────────────────────────────────────
    function update(time: number) {
      if (!s.started) {
        animRef.current = requestAnimationFrame(update);
        return;
      }

      s.time = time;
      const W = s.width;
      const H = s.height;

      // ── Background gradient ──
      const bgGrad = ctx!.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0c2d48');
      bgGrad.addColorStop(0.15, '#0a3d5c');
      bgGrad.addColorStop(0.4, '#064e6e');
      bgGrad.addColorStop(0.65, '#054055');
      bgGrad.addColorStop(0.8, '#042f42');
      bgGrad.addColorStop(1, '#021a2b');
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, W, H);

      // ── Background distant seaweed ──
      ctx!.save();
      ctx!.globalAlpha = 0.15;
      for (let i = 0; i < s.bgSeaweed.length; i++) {
        const img = s.bgSeaweed[i];
        const bx = (i / s.bgSeaweed.length) * W + Math.sin(time * 0.005 + i) * 10;
        const sway = Math.sin(time * 0.008 + i * 1.5) * 5;
        ctx!.save();
        ctx!.translate(bx, H * 0.75);
        ctx!.transform(1, 0, sway * 0.005, 1, 0, 0);
        ctx!.drawImage(img, -img.width * 0.6, -img.height * 0.8, img.width * 1.2, img.height * 0.8);
        ctx!.restore();
      }
      ctx!.restore();

      // ── Background rocks ──
      ctx!.save();
      ctx!.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        const rx = W * (0.15 + i * 0.3) + Math.sin(i * 5) * 40;
        const ry = H * 0.78;
        const rockImg = getImg('/assets/background_rock_a.png') || getImg('/assets/background_rock_b.png');
        if (rockImg) {
          ctx!.drawImage(rockImg, rx, ry, 120, 80);
        }
      }
      ctx!.restore();

      // ── Light rays ──
      for (const ray of s.lightRays) {
        drawLightRay(ray, time);
      }

      // ── Back layer fish ──
      for (const f of s.fish) {
        if (f.layer === 'back') drawFish(f, time);
      }

      // ── Jellyfish ──
      for (const jf of s.jellyfish) {
        drawJellyfish(jf, time);
      }

      // ── Mid layer fish ──
      for (const f of s.fish) {
        if (f.layer === 'mid') drawFish(f, time);
      }

      // ── Particles / Plankton ──
      ctx!.globalCompositeOperation = 'lighter';
      for (const p of s.particles) {
        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : lifeRatio < 0.2 ? lifeRatio / 0.2 : 1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.opacity * fade;
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;

      // ── Bubbles ──
      for (const b of s.bubbles) {
        drawBubble(b, time);
      }

      // ── Front layer fish ──
      for (const f of s.fish) {
        if (f.layer === 'front') drawFish(f, time);
      }

      // ── Sandy floor ──
      const floorY = H * 0.82;
      const floorGrad = ctx!.createLinearGradient(0, floorY, 0, H);
      floorGrad.addColorStop(0, '#1a4a5e');
      floorGrad.addColorStop(0.2, '#1e5060');
      floorGrad.addColorStop(0.5, '#3d7a6a');
      floorGrad.addColorStop(0.8, '#5a8a60');
      floorGrad.addColorStop(1, '#4a7040');
      ctx!.fillStyle = floorGrad;
      ctx!.beginPath();
      ctx!.moveTo(0, floorY);
      // Undulating floor
      for (let x = 0; x <= W; x += 20) {
        const undulation = Math.sin(x * 0.008 + time * 0.001) * 8 + Math.sin(x * 0.015) * 4;
        ctx!.lineTo(x, floorY + undulation);
      }
      ctx!.lineTo(W, H);
      ctx!.lineTo(0, H);
      ctx!.closePath();
      ctx!.fill();

      // ── Caustics on floor ──
      drawCaustics(time);

      // ── Terrain tiles on floor ──
      ctx!.save();
      for (let i = 0; i < s.terrainTop.length; i++) {
        const tx = (i / s.terrainTop.length) * W;
        const undulation = Math.sin(tx * 0.008 + time * 0.001) * 8 + Math.sin(tx * 0.015) * 4;
        const img = s.terrainTop[i];
        ctx!.globalAlpha = 0.6;
        ctx!.drawImage(img, tx, floorY + undulation - 5, img.width * 1.2, img.height * 1.2);
      }
      ctx!.restore();

      // ── Rocks ──
      for (const r of s.rocks) {
        const undulation = Math.sin(r.x * 0.008) * 8;
        ctx!.save();
        ctx!.translate(r.x, floorY + undulation - 10);
        ctx!.scale(r.scale, r.scale);
        ctx!.drawImage(r.img, 0, 0, r.w, r.h);
        ctx!.restore();
      }

      // ── Seaweed ──
      for (const sw of s.seaweed) {
        drawSeaweed(sw, time);
      }

      // ── Vignette ──
      const vigGrad = ctx!.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,8,20,0.5)');
      ctx!.fillStyle = vigGrad;
      ctx!.fillRect(0, 0, W, H);

      // ── Water surface shimmer at top ──
      ctx!.save();
      const surfGrad = ctx!.createLinearGradient(0, 0, 0, 40);
      surfGrad.addColorStop(0, 'rgba(120, 210, 255, 0.12)');
      surfGrad.addColorStop(1, 'rgba(120, 210, 255, 0)');
      ctx!.fillStyle = surfGrad;
      ctx!.fillRect(0, 0, W, 40);

      // Wavy surface line
      ctx!.beginPath();
      ctx!.moveTo(0, 3);
      for (let x = 0; x <= W; x += 8) {
        const waveY = Math.sin(x * 0.02 + time * 0.015) * 2 + Math.sin(x * 0.035 + time * 0.025) * 1;
        ctx!.lineTo(x, 3 + waveY);
      }
      ctx!.strokeStyle = 'rgba(150, 220, 255, 0.15)';
      ctx!.lineWidth = 2;
      ctx!.stroke();
      ctx!.restore();

      // ── Mouse-follow light glow ──
      if (s.mouseX > 0 && s.mouseY > 0) {
        const mgGrad = ctx!.createRadialGradient(s.mouseX, s.mouseY, 0, s.mouseX, s.mouseY, 180);
        mgGrad.addColorStop(0, 'rgba(100, 210, 255, 0.06)');
        mgGrad.addColorStop(1, 'rgba(100, 210, 255, 0)');
        ctx!.fillStyle = mgGrad;
        ctx!.fillRect(s.mouseX - 180, s.mouseY - 180, 360, 360);
      }

      // ─── Update physics ──────────────────────────────────────────
      // Fish
      for (const f of s.fish) {
        f.x += f.vx;
        f.y += f.vy + Math.sin(f.wobblePhase + time * f.wobbleSpeed) * 0.15;

        // Mouse avoidance (front fish only)
        if (f.layer === 'front' && s.mouseX > 0) {
          const dx = f.x - s.mouseX;
          const dy = f.y - s.mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120 * 0.5;
            f.vx += (dx / dist) * force;
            f.vy += (dy / dist) * force;
          }
        }

        // Clamp velocity
        const maxSpeed = f.layer === 'back' ? 1.2 : f.layer === 'mid' ? 2 : 3;
        const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        if (speed > maxSpeed) {
          f.vx = (f.vx / speed) * maxSpeed;
          f.vy = (f.vy / speed) * maxSpeed;
        }

        // Dampen vy
        f.vy *= 0.98;

        // Wrap horizontally
        const margin = 100;
        if (f.vx > 0 && f.x > W + margin) f.x = -margin;
        if (f.vx < 0 && f.x < -margin) f.x = W + margin;

        // Bounce vertically
        if (f.y < H * 0.05) { f.vy = Math.abs(f.vy) + 0.1; }
        if (f.y > H * 0.72) { f.vy = -Math.abs(f.vy) - 0.1; }

        // Flip based on direction
        f.flip = f.vx < 0;
      }

      // Bubbles
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i];
        b.y -= b.vy;
        b.wobblePhase += 0.02;
        b.life++;
        if (b.y < -50 || b.life > b.maxLife) {
          s.bubbles.splice(i, 1);
          spawnBubble();
        }
      }

      // Particles
      for (const p of s.particles) {
        p.x += p.vx + Math.sin(time * 0.005 + p.life * 0.01) * 0.05;
        p.y += p.vy + Math.cos(time * 0.004 + p.life * 0.008) * 0.03;
        p.life++;
        if (p.life > p.maxLife || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
          p.x = rand(0, W);
          p.y = rand(0, H);
          p.life = 0;
          p.maxLife = rand(400, 800);
        }
      }

      // Jellyfish
      for (const jf of s.jellyfish) {
        jf.x += jf.vx + Math.sin(time * 0.005 + jf.pulsePhase) * 0.2;
        jf.y += jf.vy + Math.sin(time * 0.008 + jf.pulsePhase * 2) * 0.15;
        jf.pulsePhase += 0.01;

        if (jf.y < -60) { jf.y = H * 0.5; jf.x = rand(50, W - 50); }
        if (jf.x < -50) jf.x = W + 30;
        if (jf.x > W + 50) jf.x = -30;
      }

      animRef.current = requestAnimationFrame(update);
    }

    loadAll();
    animRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [loadImg]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 cursor-none"
      style={{ background: '#041529' }}
    />
  );
}