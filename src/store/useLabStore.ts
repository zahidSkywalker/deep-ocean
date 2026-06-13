import { create } from 'zustand';

export type ViewType = 'dashboard' | 'simulation' | 'quiz';
export type Language = 'en' | 'bn';
export type ClassFilter = 'all' | '9-10' | '11-12';

interface LabState {
  currentView: ViewType;
  currentTopicId: string | null;
  language: Language;
  classFilter: ClassFilter;
  searchQuery: string;
  isPlaying: boolean;
  isSettingsOpen: boolean;
  params: Record<string, Record<string, number>>;
  quizAnswers: Record<string, number | null>;
  quizSubmitted: boolean;
  showLiveValues: boolean;

  // Actions
  setView: (view: ViewType) => void;
  setTopic: (topicId: string) => void;
  setLanguage: (lang: Language) => void;
  setClassFilter: (filter: ClassFilter) => void;
  setSearchQuery: (query: string) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setParam: (topicId: string, paramId: string, value: number) => void;
  resetParams: (topicId: string) => void;
  setQuizAnswer: (questionId: string, answerIndex: number | null) => void;
  resetQuiz: () => void;
  submitQuiz: () => void;
  goBack: () => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  currentView: 'dashboard',
  currentTopicId: null,
  language: 'en',
  classFilter: 'all',
  searchQuery: '',
  isPlaying: true,
  isSettingsOpen: false,
  params: {},
  quizAnswers: {},
  quizSubmitted: false,
  showLiveValues: true,

  setView: (view) => set({ currentView: view }),
  setTopic: (topicId) => set({ currentTopicId: topicId }),
  setLanguage: (lang) => set({ language: lang }),
  setClassFilter: (filter) => set({ classFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  setParam: (topicId, paramId, value) =>
    set((s) => ({
      params: {
        ...s.params,
        [topicId]: {
          ...(s.params[topicId] || {}),
          [paramId]: value,
        },
      },
    })),
  resetParams: (topicId) =>
    set((s) => {
      const newParams = { ...s.params };
      delete newParams[topicId];
      return { params: newParams, isPlaying: false };
    }),
  setQuizAnswer: (questionId, answerIndex) =>
    set((s) => ({
      quizAnswers: { ...s.quizAnswers, [questionId]: answerIndex },
    })),
  resetQuiz: () => set({ quizAnswers: {}, quizSubmitted: false }),
  submitQuiz: () => set({ quizSubmitted: true }),
  goBack: () =>
    set((s) => ({
      currentView: 'dashboard',
      currentTopicId: null,
      isSettingsOpen: false,
      isPlaying: true,
      quizAnswers: {},
      quizSubmitted: false,
    })),
}));
