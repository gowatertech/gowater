
import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

// Exportamos el tipo User para poder usarlo en otros componentes
export type User = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'driver' | 'assistant' | 'user';
  createdAt: string;
};

type CurrentUserStore = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
};

// Crear un store para el usuario actual
const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRequest('GET', '/api/me');
      if (response.ok) {
        const user = await response.json();
        set({ user, isLoading: false });
      } else {
        console.error('Error al obtener usuario:', response.status);
        set({ 
          user: null, 
          isLoading: false,
          error: new Error(`Error al obtener usuario: ${response.status}`)
        });
      }
    } catch (error) {
      console.error('Error en fetch usuario:', error);
      set({ 
        user: null, 
        isLoading: false,
        error: error as Error 
      });
    }
  },
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiRequest('POST', '/api/logout');
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },
}));

// Hook para usar en componentes
export function useCurrentUser() {
  const { user, isLoading, error, fetchUser, logout } = useCurrentUserStore();
  
  useEffect(() => {
    if (!user && !isLoading && !error) {
      fetchUser();
    }
  }, [user, isLoading, error, fetchUser]);

  return { user, isLoading, error, fetchUser, logout };
}
