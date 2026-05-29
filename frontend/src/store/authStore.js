import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      updateUser: (updates) =>
        set(state => ({ user: state.user ? { ...state.user, ...updates } : state.user })),

      updateWallet: (balance) =>
        set(state => ({ user: state.user ? { ...state.user, walletBalance: balance } : null })),

      logout: async () => {
        const { refreshToken } = get();
        try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
        }
        state?.setHasHydrated?.(true);
      },
    }
  )
);
