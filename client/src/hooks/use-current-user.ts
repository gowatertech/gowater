
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

type LoginResult = {
  success: boolean;
  message: string;
  user?: User;
};

type CurrentUserStore = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  login: (username: string, password: string) => Promise<LoginResult>;
};

// Crear un store para el usuario actual
const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest({ url: '/api/authtest', method: 'GET' });
      // El endpoint authtest devuelve { user, sessionUser, companyId }
      const user = result.user || result.sessionUser;
      if (user) {
        set({ user, isLoading: false });
      } else {
        set({ user: null, isLoading: false, error: new Error('No autenticado') });
      }
    } catch (error) {
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
      // Guardar la URL actual antes de hacer logout para determinar a dónde redirigir
      const currentPath = window.location.pathname;
      let redirectPath = '/';
      
      // Determinar el tipo de interfaz (company, mobile, platform)
      if (currentPath.startsWith('/mobile-app')) {
        redirectPath = '/mobile-app/login';
      } else if (currentPath.startsWith('/platform')) {
        redirectPath = '/platform/login';
      } else {
        redirectPath = '/';
      }
      
      // Intentar primero con el endpoint regular
      try {
        await apiRequest({ url: '/api/logout', method: 'POST' });
      } catch {
        // Si falla, intentar con el endpoint móvil
        try {
          await apiRequest({ url: '/api/mobile/logout', method: 'POST' });
        } catch {
          // Si también falla, intentar con el endpoint de platform
          await apiRequest({ url: '/api/platform/platform-logout', method: 'POST' });
        }
      }
      
      // Eliminar usuario del estado después de cerrar sesión
      set({ user: null, isLoading: false });
      
      // Limpiar el historial actual para prevenir navegación hacia atrás
      // Esto es crucial para evitar que el usuario pueda volver a páginas protegidas
      window.history.replaceState(null, "", redirectPath);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      set({ error: error as Error, isLoading: false });
    }
  },
  login: async (username: string, password: string): Promise<LoginResult> => {
    set({ isLoading: true, error: null });
    try {
      // Intentar login con la API móvil
      console.log('Intentando login con credenciales:', { username, password });
      const response = await fetch('/api/mobile/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Login exitoso:', result.user);
        set({ user: result.user, isLoading: false });
        return {
          success: true,
          message: result.message || "Login exitoso",
          user: result.user
        };
      } else {
        console.error('Error en login:', result.message);
        set({ 
          user: null, 
          isLoading: false,
          error: new Error(result.message || "Error de autenticación") 
        });
        return {
          success: false,
          message: result.message || "Error de autenticación"
        };
      }
    } catch (error) {
      console.error('Error al intentar login:', error);
      set({ 
        user: null, 
        isLoading: false,
        error: error as Error 
      });
      return {
        success: false,
        message: (error as Error).message || "Error en el servidor"
      };
    }
  },
}));

// Hook para usar en componentes
export function useCurrentUser() {
  const { user, isLoading, error, logout, login } = useCurrentUserStore();
  const store = useCurrentUserStore();
  
  useEffect(() => {
    // Solo cargar si no hay usuario y no se está cargando
    if (!user && !isLoading) {
      store.fetchUser();
    }
  }, []); // Ejecutar solo una vez al montar el componente

  return { user, isLoading, error, fetchUser: store.fetchUser, logout, login };
}
