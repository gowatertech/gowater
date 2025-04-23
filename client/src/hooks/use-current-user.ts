
import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

// Exportamos el tipo User para poder usarlo en otros componentes
// Tipo para la información de la empresa
export type Company = {
  id: number;
  name: string;
  subdomain: string;
}

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
  company?: Company;
};

type CurrentUserStore = {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  error: Error | null;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  login: (username: string, password: string) => Promise<LoginResult>;
};

// Crear un store para el usuario actual
const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  user: null,
  company: null,
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
        
        // Obtener información del usuario
        const user = result.success && result.user ? result.user : result;
        console.log('Usuario obtenido:', user);
        
        // Obtener información de la empresa si está disponible
        let company = null;
        if (result.company) {
          company = result.company;
          console.log('Empresa detectada:', company);
        }
        
        set({ 
          user, 
          company,
          isLoading: false 
        });
      } else {
        console.error('Error al obtener usuario:', response.status);
        set({ 
          user: null,
          company: null,
          isLoading: false,
          error: new Error(`Error al obtener usuario: ${response.status}`)
        });
      }
    } catch (error) {
      console.error('Error en fetch usuario:', error);
      set({ 
        user: null,
        company: null,
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
      set({ user: null, company: null, isLoading: false });
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
        
        // Obtener información de la empresa si está disponible
        let company = null;
        if (result.company) {
          company = result.company;
          console.log('Empresa detectada en login:', company);
        }
        
        set({ 
          user: result.user, 
          company,
          isLoading: false 
        });
        
        return {
          success: true,
          message: result.message || "Login exitoso",
          user: result.user,
          company: result.company
        };
      } else {
        console.error('Error en login:', result.message);
        set({ 
          user: null, 
          company: null,
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
        company: null,
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
  const { user, company, isLoading, error, fetchUser, logout, login } = useCurrentUserStore();
  
  useEffect(() => {
    if (!user && !isLoading && !error) {
      fetchUser();
    }
  }, [user, isLoading, error, fetchUser]);

  return { user, company, isLoading, error, fetchUser, logout, login };
}
