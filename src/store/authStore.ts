import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API } from '@/lib/api';

interface AuthState {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,

      login: async (username, password) => {
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return { ok: false, error: data.error || 'Error al iniciar sesión' };
          }
          set({ token: data.token, username: data.username ?? username });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: 'No se pudo conectar con el servidor' };
        }
      },

      logout: () => set({ token: null, username: null }),

      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-storage' }
  )
);
