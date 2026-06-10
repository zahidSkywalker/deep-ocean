'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

export default function HUD() {
  const timeOfDay = useWorldStore((s) => s.timeOfDay);
  const weather = useWorldStore((s) => s.weather);
  const isPointerLocked = useWorldStore((s) => s.isPointerLocked);
  const showControls = useWorldStore((s) => s.showControls);
  const setShowControls = useWorldStore((s) => s.setShowControls);
  const cycleWeather = useWorldStore((s) => s.cycleWeather);
  const togglePause = useWorldStore((s) => s.togglePause);
  const isPaused = useWorldStore((s) => s.isPaused);
  const playerPosition = useWorldStore((s) => s.playerPosition);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Crosshair */}
      {isPointerLocked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-6 w-6 items-center justify-center">
            <div className="absolute h-px w-3 bg-white/40" />
            <div className="absolute h-3 w-px bg-white/40" />
            <div className="h-1 w-1 rounded-full bg-white/60" />
          </div>
        </div>
      )}

      {/* Top-left: Time & Weather */}
      <div className="absolute left-4 top-4 flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{weatherIcons[weather]}</span>
            <div>
              <div className="font-mono text-lg font-bold text-white/90">
                {formatTime(timeOfDay)}
              </div>
              <div className="text-xs text-white/50">
                {getTimePeriod(timeOfDay)} · {weatherLabels[weather]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top-right: Controls hint */}
      {isPointerLocked && (
        <div className="absolute right-4 top-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">ESC</span>
            <span>Menu</span>
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">T</span>
            <span>Weather</span>
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">P</span>
            <span>Pause</span>
          </div>
        </div>
      )}

      {/* Bottom-left: Position */}
      {isPointerLocked && (
        <div className="absolute bottom-4 left-4">
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
            <div className="font-mono text-[10px] text-white/30">
              X: {playerPosition[0].toFixed(0)} · Z: {playerPosition[2].toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Center: Start screen / Controls overlay */}
      {!isPointerLocked && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-black/70 p-8 text-center backdrop-blur-xl">
            {/* Title */}
            <div className="mb-2">
              <h1 className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Open City World
              </h1>
              <p className="mt-1 text-sm text-white/40">
                A photorealistic urban exploration experience
              </p>
            </div>

            {/* Credits */}
            <div className="mb-6 rounded-lg border border-white/5 bg-white/5 px-4 py-2">
              <p className="text-xs text-white/30">
                Built by <span className="font-semibold text-white/50">Zahidul Islam</span>
              </p>
            </div>

            {/* Click to start */}
            <button
              onClick={() => {
                const canvas = document.querySelector('canvas');
                if (canvas) canvas.requestPointerLock();
              }}
              className="group relative mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-semibold text-black transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Click to Explore</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            {/* Controls */}
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
                <span>Cycle weather</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paused overlay */}
      {isPointerLocked && isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-black/60 px-6 py-4 backdrop-blur-md">
            <p className="text-lg font-semibold text-white/80">⏸ Paused</p>
            <p className="mt-1 text-xs text-white/40">
              Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">P</kbd> to resume
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Keyboard handlers for HUD controls (mounted outside canvas) ─── */
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleWeather, togglePause]);

  return null;
}
