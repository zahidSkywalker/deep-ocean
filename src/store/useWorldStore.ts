import { create } from 'zustand';

export type WeatherType = 'clear' | 'rain' | 'fog' | 'storm';

interface WorldState {
  // Time: 0-1 where 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
  timeOfDay: number;
  timeSpeed: number; // Full cycle in 5 minutes = 300 seconds
  weather: WeatherType;
  isPaused: boolean;
  playerPosition: [number, number, number];
  walkSpeed: number;
  sprintSpeed: number;
  isPointerLocked: boolean;
  showControls: boolean;
  // Actions
  setTime: (t: number) => void;
  setWeather: (w: WeatherType) => void;
  togglePause: () => void;
  setPlayerPosition: (p: [number, number, number]) => void;
  setIsPointerLocked: (v: boolean) => void;
  setShowControls: (v: boolean) => void;
  cycleWeather: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  timeOfDay: 0.35, // Start at morning
  timeSpeed: 1 / 300, // Full cycle in 300 seconds (5 minutes)
  weather: 'clear',
  isPaused: false,
  playerPosition: [0, 1.7, 0],
  walkSpeed: 5,
  sprintSpeed: 10,
  isPointerLocked: false,
  showControls: true,

  setTime: (t) => set({ timeOfDay: t % 1 }),
  setWeather: (w) => set({ weather: w }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setPlayerPosition: (p) => set({ playerPosition: p }),
  setIsPointerLocked: (v) => set({ isPointerLocked: v }),
  setShowControls: (v) => set({ showControls: v }),
  cycleWeather: () => {
    const order: WeatherType[] = ['clear', 'rain', 'fog', 'storm'];
    const current = get().weather;
    const idx = order.indexOf(current);
    set({ weather: order[(idx + 1) % order.length] });
  },
}));
