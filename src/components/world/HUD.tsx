'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWorldStore, WeatherType } from '@/store/useWorldStore';

const weatherIcons: Record<WeatherType, string> = {
  clear: '☀',
  rain: '🌧',
  fog: '🌫',
  storm: '⚡',
};

const weatherLabels: Record<WeatherType, string> = {
  clear: 'Clear',
  rain: 'Rain',
  fog: 'Fog',
  storm: 'Storm',
};

function formatTime(t: number): string {
  const hours = Math.floor(t * 24);
  const minutes = Math.floor((t * 24 - hours) * 60);
  const h = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function getTimePeriod(t: number): string {
  if (t < 0.22 || t > 0.78) return 'Night';
  if (t < 0.3) return 'Dawn';
  if (t < 0.45) return 'Morning';
  if (t < 0.55) return 'Noon';
  if (t < 0.7) return 'Afternoon';
  return 'Dusk';
}

/* ─── Virtual Joystick Component ─── */
function VirtualJoystick({ side }: { side: 'left' | 'right' }) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const isMoveJoystick = side === 'left';
  const radius = 50;
  const knobRadius = 30;

  const handleStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    const store = useWorldStore.getState();
    if (!store.isPlaying) store.setIsPlaying(true);
  }, []);

  const handleMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        const dx = touch.clientX - centerRef.current.x;
        const dy = touch.clientY - centerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, radius - knobRadius / 2);
        const angle = Math.atan2(dy, dx);
        const clampX = Math.cos(angle) * clampedDist;
        const clampY = Math.sin(angle) * clampedDist;

        if (knobRef.current) {
          knobRef.current.style.transform = `translate(${clampX}px, ${clampY}px)`;
        }

        const normX = clampX / radius;
        const normY = clampY / radius;

        if (isMoveJoystick) {
          useWorldStore.getState().setJoystickInput({ x: normX, y: normY });
        } else {
          // Look joystick: rotate camera
          const store = useWorldStore.getState();
          const sensitivity = 0.03;
          store.setPlayerRotation({
            x: Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, store.playerRotation.x - normY * sensitivity)),
            y: store.playerRotation.y - normX * sensitivity,
          });
        }
      }
    }
  }, [isMoveJoystick]);

  const handleEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        if (isMoveJoystick) {
          useWorldStore.getState().setJoystickInput({ x: 0, y: 0 });
        }
      }
    }
  }, [isMoveJoystick]);

  return (
    <div
      ref={joystickRef}
      className="fixed z-[100] h-32 w-32 touch-none select-none"
      style={side === 'left' ? { bottom: '2rem', left: '2rem' } : { bottom: '2rem', right: '2rem' }}
    >
      {/* Base ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-sm" />
      {/* Knob */}
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-md transition-shadow active:bg-white/25"
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        {isMoveJoystick ? (
          <svg className="h-5 w-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </div>
    </div>
  );
}

/* ─── Touch Look Area (when no right joystick active) ─── */
function TouchLookArea() {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const store = useWorldStore.getState();
    if (!store.isPlaying) store.setIsPlaying(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const store = useWorldStore.getState();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const prevX = touch.clientX - (touch as any)._prevX;
      const prevY = touch.clientY - (touch as any)._prevY;
      (touch as any)._prevX = touch.clientX;
      (touch as any)._prevY = touch.clientY;

      const sensitivity = 0.004;
      store.setPlayerRotation({
        x: Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, store.playerRotation.x - prevY * sensitivity)),
        y: store.playerRotation.y - prevX * sensitivity,
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      delete (e.changedTouches[i] as any)._prevX;
      delete (e.changedTouches[i] as any)._prevY;
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] touch-none select-none md:hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}

/* ─── Main HUD ─── */
export default function HUD() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const weather = useWorldStore((s) => s.weather);
  const isPointerLocked = useWorldStore((s) => s.isPointerLocked);
  const isPlaying = useWorldStore((s) => s.isPlaying);
  const isMobile = useWorldStore((s) => s.isMobile);
  const isPaused = useWorldStore((s) => s.isPaused);
  const playerPosition = useWorldStore((s) => s.playerPosition);
  const setIsPlaying = useWorldStore((s) => s.setIsPlaying);
  const setIsPointerLocked = useWorldStore((s) => s.setIsPointerLocked);
  const cycleWeather = useWorldStore((s) => s.cycleWeather);
  const togglePause = useWorldStore((s) => s.togglePause);

  const isActive = isMobile ? isPlaying : isPointerLocked;
  const showStartScreen = !isActive;

  // Desktop: handle pointer lock from canvas
  useEffect(() => {
    if (!isMobile) {
      const handleCanvasClick = () => {
        const canvas = document.querySelector('canvas');
        if (canvas && !useWorldStore.getState().isPointerLocked) {
          canvas.requestPointerLock();
        }
      };

      // Also add a document-level click handler as fallback
      const handleDocClick = (e: MouseEvent) => {
        if (!useWorldStore.getState().isPointerLocked) {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            canvas.requestPointerLock();
          }
        }
      };

      const canvas = document.querySelector('canvas');
      canvas?.addEventListener('click', handleCanvasClick);

      // Listen for pointer lock changes
      const handleLockChange = () => {
        const locked = document.pointerLockElement !== null;
        useWorldStore.getState().setIsPointerLocked(locked);
        if (locked) useWorldStore.getState().setIsPlaying(true);
      };
      document.addEventListener('pointerlockchange', handleLockChange);

      return () => {
        canvas?.removeEventListener('click', handleCanvasClick);
        document.removeEventListener('pointerlockchange', handleLockChange);
      };
    }
  }, [isMobile]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Crosshair (desktop only, when locked) */}
      {isPointerLocked && !isMobile && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-6 w-6 items-center justify-center">
            <div className="absolute h-px w-3 bg-white/40" />
            <div className="absolute h-3 w-px bg-white/40" />
            <div className="h-1 w-1 rounded-full bg-white/60" />
          </div>
        </div>
      )}

      {/* Top-left: Time & Weather */}
      <div className="absolute left-3 top-3 flex items-start gap-2 sm:left-4 sm:top-4">
        <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{weatherIcons[weather]}</span>
            <div>
              <div className="font-mono text-sm font-bold text-white/90 sm:text-lg">
                {formatTime(timeOfDay)}
              </div>
              <div className="text-[10px] text-white/50 sm:text-xs">
                {getTimePeriod(timeOfDay)} · {weatherLabels[weather]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top-right: Weather & Pause buttons (when playing) */}
      {isActive && (
        <div className="pointer-events-auto absolute right-3 top-3 flex gap-2 sm:right-4 sm:top-4">
          <button
            onClick={(e) => { e.stopPropagation(); cycleWeather(); }}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/50 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white/80 sm:px-3 sm:py-2"
          >
            {weatherIcons[weather]} {weatherLabels[weather]}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); togglePause(); }}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/50 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white/80 sm:px-3 sm:py-2"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      )}

      {/* Bottom-left: Position (when playing, desktop only) */}
      {isActive && !isMobile && (
        <div className="absolute bottom-4 left-4">
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
            <div className="font-mono text-[10px] text-white/30">
              X: {playerPosition[0].toFixed(0)} · Z: {playerPosition[2].toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Top hint when playing */}
      {isActive && isMobile && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 sm:hidden">
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 backdrop-blur-md">
            <span className="text-[10px] text-white/30">
              Tap top area to pause
            </span>
          </div>
        </div>
      )}

      {/* ═══ Start Screen Overlay ═══ */}
      {showStartScreen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-black/80 p-6 text-center backdrop-blur-xl sm:p-8">
            {/* Title */}
            <div className="mb-2">
              <h1 className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-4xl">
                Open City World
              </h1>
              <p className="mt-1 text-xs text-white/40 sm:text-sm">
                A photorealistic urban exploration experience
              </p>
            </div>

            {/* Credits */}
            <div className="mb-5 rounded-lg border border-white/5 bg-white/5 px-4 py-2 sm:mb-6">
              <p className="text-[10px] text-white/30 sm:text-xs">
                Built by <span className="font-semibold text-white/50">Zahidul Islam</span>
              </p>
            </div>

            {/* Start button */}
            <button
              onClick={() => {
                if (isMobile) {
                  setIsPlaying(true);
                } else {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    canvas.requestPointerLock();
                  }
                }
              }}
              className="group relative mb-5 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-semibold text-black transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95 sm:mb-6"
            >
              <span className="relative z-10">
                {isMobile ? 'Tap to Explore' : 'Click to Explore'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            {/* Controls info */}
            {isMobile ? (
              <div className="space-y-2 text-xs text-white/40">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                    <div className="h-6 w-6 rounded-full border border-white/30 bg-white/10" />
                    <span>Left: Move</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                    <div className="h-6 w-6 rounded-full border border-white/30 bg-white/10" />
                    <span>Right: Look</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-left text-xs text-white/50">
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <div className="flex gap-0.5">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">W</kbd>
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">A</kbd>
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">S</kbd>
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">D</kbd>
                  </div>
                  <span>Move</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Shift</kbd>
                  <span>Sprint</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Mouse</kbd>
                  <span>Look around</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">T</kbd>
                  <span>Weather</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paused overlay */}
      {isActive && isPaused && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 rounded-2xl border border-white/10 bg-black/70 p-6 text-center backdrop-blur-xl sm:p-8">
            <p className="text-lg font-semibold text-white/80">⏸ Paused</p>
            <p className="mt-2 text-xs text-white/40">
              {isMobile ? 'Tap below to resume' : 'Press P or ESC to resume'}
            </p>
            <button
              onClick={() => togglePause()}
              className="mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2 font-semibold text-black transition-all hover:scale-105 active:scale-95"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Mobile Virtual Joysticks (rendered when playing) */}
      {isMobile && isPlaying && !isPaused && (
        <>
          <div className="pointer-events-auto">
            <VirtualJoystick side="left" />
          </div>
          <div className="pointer-events-auto">
            <VirtualJoystick side="right" />
          </div>
        </>
      )}

      {/* Mobile: Tap upper screen to pause */}
      {isMobile && isPlaying && !isPaused && (
        <div
          className="pointer-events-auto fixed left-1/2 top-0 z-[95] h-16 w-full -translate-x-1/2"
          onClick={() => togglePause()}
        />
      )}
    </div>
  );
}

/* ─── Keyboard handlers (desktop only) ─── */
export function HUDKeyboardHandler() {
  const cycleWeather = useWorldStore((s) => s.cycleWeather);
  const togglePause = useWorldStore((s) => s.togglePause);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyT') {
        e.preventDefault();
        cycleWeather();
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        togglePause();
      }
      if (e.code === 'Escape') {
        // Pointer lock will handle this naturally
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleWeather, togglePause]);

  return null;
}
