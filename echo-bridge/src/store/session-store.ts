import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActivityStep {
  id: string;
  label: string;
  status: 'active' | 'completed' | 'pending';
  icon: string; // lucide icon name
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'echo';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'error';
  imageUrl?: string;
  activitySteps?: ActivityStep[];
}

export interface Session {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;

  createSession: () => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  getActiveSession: () => Session | undefined;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = generateId();
        const now = Date.now();
        const newSession: Session = {
          id,
          name: 'New Session',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          // If this is the very first session, set it as active
          const isActive = state.sessions.length === 0;
          return {
            sessions: [newSession, ...state.sessions],
            activeSessionId: isActive ? id : state.activeSessionId,
          };
        });

        return id;
      },

      deleteSession: (id: string) => {
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== id);
          let newActiveId = state.activeSessionId;

          if (state.activeSessionId === id) {
            newActiveId = filtered.length > 0 ? filtered[0].id : null;
          }

          // If no sessions remain, create a new one
          if (filtered.length === 0) {
            const now = Date.now();
            const freshId = generateId();
            const fresh: Session = {
              id: freshId,
              name: 'New Session',
              messages: [],
              createdAt: now,
              updatedAt: now,
            };
            return {
              sessions: [fresh],
              activeSessionId: freshId,
            };
          }

          return {
            sessions: filtered,
            activeSessionId: newActiveId,
          };
        });
      },

      renameSession: (id: string, name: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, name, updatedAt: Date.now() } : s
          ),
        }));
      },

      setActiveSession: (id: string) => {
        set({ activeSessionId: id });
      },

      addMessage: (sessionId: string, message: ChatMessage) => {
        set((state) => {
          const sessions = state.sessions.map((s) => {
            if (s.id !== sessionId) return s;

            // Auto-name session from first user message
            let name = s.name;
            if (
              name === 'New Session' &&
              message.role === 'user' &&
              s.messages.length === 0
            ) {
              name = message.content.slice(0, 30).trim() + (message.content.length > 30 ? '…' : '');
            }

            return {
              ...s,
              name,
              messages: [...s.messages, message],
              updatedAt: Date.now(),
            };
          });

          return { sessions };
        });
      },

      updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },
    }),
    {
      name: 'echo-bridge-sessions',
      // Only persist these fields
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);