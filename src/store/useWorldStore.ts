import { create } from 'zustand';

export type WeatherType = 'clear' | 'rain' | 'fog' | 'storm';

interface WorldState {
  // Time: 0-1 where 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
  timeOfDay: number;
  timeSpeed: number; // Full cycle in 5 minutes = 300 seconds
  weather: WeatherType;
  isPaused: boolean;
  isPlaying: boolean; // true = game is active (moving/looking)
  playerPosition: [number, number, number];
  playerRotation: { x: number; y: number }; // euler angles for camera
  walkSpeed: number;
  sprintSpeed: number;
  isPointerLocked: boolean;
  isMobile: boolean;
  isSprintActive: boolean; // Mobile sprint button
  // Touch joystick input
  joystickInput: { x: number; y: number };
  // Actions
  setTime: (t: number) => void;
  setWeather: (w: WeatherType) => void;
  togglePause: () => void;
  setPlayerPosition: (p: [number, number, number]) => void;
  setPlayerRotation: (r: { x: number; y: number }) => void;
  setIsPointerLocked: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  setIsMobile: (v: boolean) => void;
  setSprintActive: (v: boolean) => void;
  setJoystickInput: (input: { x: number; y: number }) => void;
  cycleWeather: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  timeOfDay: 0.35, // Start at morning
  timeSpeed: 1 / 300, // Full cycle in 300 seconds (5 minutes)
  weather: 'clear',
  isPaused: false,
  isPlaying: false,
  playerPosition: [0, 1.7, 20],
  playerRotation: { x: 0, y: 0 },
  walkSpeed: 5,
  sprintSpeed: 10,
  isPointerLocked: false,
  isMobile: false,
  isSprintActive: false,
  joystickInput: { x: 0, y: 0 },

  setTime: (t) => set({ timeOfDay: t % 1 }),
  setWeather: (w) => set({ weather: w }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setPlayerPosition: (p) => set({ playerPosition: p }),
  setPlayerRotation: (r) => set({ playerRotation: r }),
  setIsPointerLocked: (v) => set({ isPointerLocked: v }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setIsMobile: (v) => set({ isMobile: v }),
  setSprintActive: (v) => set({ isSprintActive: v }),
  setJoystickInput: (input) => set({ joystickInput: input }),
  cycleWeather: () => {
    const order: WeatherType[] = ['clear', 'rain', 'fog', 'storm'];
    const current = get().weather;
    const idx = order.indexOf(current);
    set({ weather: order[(idx + 1) % order.length] });
  },
}));
