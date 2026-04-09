import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiagnosisAnswer, NoifReport, OnboardingProfile } from '../types/noif';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'OPERATOR';
  plan: 'FREE' | 'BASIC' | 'ADVANCED';
  consultationsLeft: number;
  onboardingCompleted: boolean;
  onboarding?: {
    city: string;
    industries: string[];
    resourcePrefs: string[];
  } & Partial<OnboardingProfile>;
  reports?: NoifReport[];
  diagnosisAnswers?: DiagnosisAnswer[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        localStorage.setItem('opc_token', token);
        set({ token, user, isAuthenticated: true });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => {
        localStorage.removeItem('opc_token');
        localStorage.removeItem('opc_user');
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'opc_auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
