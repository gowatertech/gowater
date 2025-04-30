
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
      // El método apiRequest ya maneja la conversión a JSON automáticamente
      // y lanza errores si hay problemas
      try {
        // Intentar primero con el endpoint regular
        console.log('Obteniendo usuario desde /api/me');
        const result = await apiRequest('/api/me', { method: 'GET' });
        
        // Manejar ambos formatos de respuesta (objeto directo o { success: true, user: {...} })
        const user = result.success && result.user ? result.user : result;
        console.log('Usuario obtenido:', user);
        set({ user, isLoading: false });
        return;
      } catch (errorMe) {
        console.log('Error al obtener de /api/me, intentando con endpoint móvil', errorMe);
        
        // Si el endpoint regular falla, intentar con el endpoint móvil
        try {
          const result = await apiRequest('/api/mobile/me', { method: 'GET' });
          
          // Manejar ambos formatos de respuesta
          const user = result.success && result.user ? result.user : result;
          console.log('Usuario obtenido desde móvil:', user);
          set({ user, isLoading: false });
          return;
        } catch (errorMobile) {
          console.error('Error al obtener usuario de endpoint móvil:', errorMobile);
          throw errorMobile;
        }
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
        await apiRequest('/api/logout', { method: 'POST' });
      } catch {
        // Si falla, intentar con el endpoint móvil
        try {
          await apiRequest('/api/mobile/logout', { method: 'POST' });
        } catch {
          // Si también falla, intentar con el endpoint de platform
          await apiRequest('/api/platform/platform-logout', { method: 'POST' });
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
      // Intentar login con la API móvil primero, luego con el endpoint regular
      console.log('Intentando login con credenciales:', { username });
      
      try {
        // Primero intentar con el endpoint móvil
        console.log('Intentando login con endpoint móvil');
        const result = await apiRequest('/api/mobile/login', {
          method: 'POST',
          data: { username, password }
        });

        if (result.success) {
          console.log('Login exitoso con API móvil:', result.user);
          set({ user: result.user, isLoading: false });
          return {
            success: true,
            message: result.message || "Login exitoso",
            user: result.user
          };
        } else {
          throw new Error(result.message || "Error de autenticación en API móvil");
        }
      } catch (mobileError) {
        console.log('Error en login móvil, intentando con endpoint regular:', mobileError);
        
        try {
          // Si falla el endpoint móvil, intentar con el endpoint regular
          const result = await apiRequest('/api/login', {
            method: 'POST',
            data: { username, password }
          });
          
          console.log('Login exitoso con API regular:', result);
          const user = result.success && result.user ? result.user : result;
          set({ user, isLoading: false });
          return {
            success: true,
            message: "Login exitoso",
            user
          };
        } catch (regularError) {
          console.error('Error en login regular:', regularError);
          throw regularError;
        }
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
  const { user, isLoading, error, fetchUser, logout, login } = useCurrentUserStore();
  
  useEffect(() => {
    if (!user && !isLoading && !error) {
      fetchUser();
    }
  }, [user, isLoading, error, fetchUser]);

  return { user, isLoading, error, fetchUser, logout, login };
}
