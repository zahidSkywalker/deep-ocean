import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RegisterFormValues } from '@/types';

interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (data: RegisterFormValues) => boolean;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string, _password: string): boolean => {
        // Mock: check if a saved user exists with that email
        const existing = get().user;
        if (existing && existing.email === email) {
          return true;
        }
        // Create a new user for any email/password
        const user: User = {
          id: generateId(),
          firstName: 'John',
          lastName: 'Doe',
          email,
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true });
        return true;
      },

      register: (data: RegisterFormValues): boolean => {
        const user: User = {
          id: generateId(),
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (data: Partial<User>) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...data } });
        }
      },
    }),
    {
      name: 'artisanmarket-auth',
    }
  )
);