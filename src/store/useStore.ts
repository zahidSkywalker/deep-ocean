import { create } from 'zustand'

interface AppState {
  currentView: 'dashboard' | 'simulation'
  currentTopic: string | null
  setView: (view: 'dashboard' | 'simulation') => void
  setTopic: (topic: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  currentTopic: null,
  setView: (view) => set({ currentView: view }),
  setTopic: (topic) => set({ currentTopic: topic }),
}))
