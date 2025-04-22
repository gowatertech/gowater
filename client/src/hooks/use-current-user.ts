
import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

// Exportamos el tipo User para poder usarlo en otros componentes
export type User = {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: 'admin' | 'driver' | 'assistant' | 'user' | 'supervisor' | 'cashier';
  companyId?: number;
  createdAt?: string;
  active?: boolean;
  phone?: string;
  license?: string;
  licenseExpiry?: string;
  emergencyContact?: string;
  currentLocation?: string;
  lastLocationUpdate?: string;
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
      // Intentar primero con el endpoint regular
      let response = await apiRequest('GET', '/api/me');
      
      // Si el endpoint regular falla, intentar con el endpoint móvil
      if (!response.ok) {
        console.log('Intentando con endpoint móvil');
        response = await apiRequest('GET', '/api/mobile/me');
      }
      
      if (response.ok) {
        const result = await response.json();
        // Manejar ambos formatos de respuesta (objeto directo o { success: true, user: {...} })
        const user = result.success && result.user ? result.user : result;
        console.log('Usuario obtenido:', user);
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
      // Intentar primero con el endpoint regular
      try {
        await apiRequest('POST', '/api/logout');
      } catch {
        // Si falla, intentar con el endpoint móvil
        await apiRequest('POST', '/api/mobile/logout');
      }
      set({ user: null, isLoading: false });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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
