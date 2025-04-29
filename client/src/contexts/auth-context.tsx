import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useLocation, useNavigate } from 'wouter';
import { toast } from '@/hooks/use-toast';

// Interfaz para el usuario autenticado
export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: string;
  companyId: number;
  active?: boolean;
  // Otros campos específicos del usuario
  phone?: string;
  license?: string;
  licenseExpiry?: string;
  emergencyContact?: string;
  currentLocation?: string;
  lastLocationUpdate?: string;
}

// Interfaz para el contexto de autenticación
interface AuthContextType {
  user: User | null;
  companyId: number | null;
  loading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [location, navigate] = useLocation();
  
  // Función para obtener información del usuario al cargar
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Intentar obtener datos del usuario
        const response = await apiRequest('GET', '/api/user');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.user) {
            console.log('Usuario obtenido:', data.user);
            setUser(data.user);
            
            // Obtener companyId de la respuesta o del usuario
            const effectiveCompanyId = data.companyId || data.user?.companyId;
            
            if (effectiveCompanyId) {
              console.log('CompanyId obtenido:', effectiveCompanyId);
              setCompanyId(effectiveCompanyId);
            } else {
              console.warn('No se encontró companyId en la respuesta');
            }
          } else {
            // Si la respuesta es exitosa pero no contiene usuario (raro)
            console.warn('Respuesta exitosa pero sin datos de usuario');
            setUser(null);
            setCompanyId(null);
          }
        } else {
          // Si no está autenticado, manejar apropiadamente
          console.log('No autenticado o sesión expirada');
          setUser(null);
          setCompanyId(null);
          
          // Si estamos en una ruta protegida, redirigir al login
          const isProtectedRoute = 
            location !== '/auth/login' && 
            location !== '/mobile-app/login' && 
            location !== '/platform/login' &&
            !location.startsWith('/landing');
            
          if (isProtectedRoute) {
            console.log('Redirigiendo automáticamente a la página de login');
            
            // Determinar a qué página de login redirigir
            let loginPage = '/auth/login';
            if (location.startsWith('/mobile-app')) {
              loginPage = '/mobile-app/login';
            } else if (location.startsWith('/platform')) {
              loginPage = '/platform/login';
            }
            
            navigate(loginPage);
          }
        }
      } catch (err) {
        console.error('Error al obtener usuario:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [location, navigate]);
  
  // Función de login
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      
      // Determinar qué endpoint usar basado en la ruta actual
      let endpoint = '/api/login';
      if (location.startsWith('/mobile-app')) {
        endpoint = '/api/mobile/login';
      } else if (location.startsWith('/platform')) {
        endpoint = '/api/platform/platform-login';
      }
      
      const response = await apiRequest('POST', endpoint, { username, password });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.user) {
          setUser(data.user);
          setCompanyId(data.user.companyId);
          
          // Mostrar mensaje de bienvenida
          toast({
            title: "Bienvenido",
            description: `Sesión iniciada como ${data.user.name}`,
          });
          
          // Redireccionar basado en el tipo de interfaz y rol
          if (location.startsWith('/mobile-app')) {
            navigate('/mobile-app');
          } else if (location.startsWith('/platform')) {
            navigate('/platform');
          } else {
            navigate('/');
          }
          
          return { success: true };
        } else {
          // Respuesta exitosa pero sin datos de usuario
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Error inesperado al iniciar sesión",
          });
          
          return { 
            success: false, 
            message: data.message || "Error inesperado al iniciar sesión"
          };
        }
      } else {
        // Respuesta de error del servidor
        const errorData = await response.json();
        
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: errorData.message || "Credenciales inválidas",
        });
        
        return { 
          success: false, 
          message: errorData.message || "Credenciales inválidas"
        };
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError(err as Error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: (err as Error).message || "Error de conexión",
      });
      
      return { 
        success: false, 
        message: (err as Error).message || "Error de conexión"
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Función de logout
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Determinar qué endpoint usar basado en la ruta actual
      let endpoint = '/api/logout';
      if (location.startsWith('/mobile-app')) {
        endpoint = '/api/mobile/logout';
      } else if (location.startsWith('/platform')) {
        endpoint = '/api/platform/platform-logout';
      }
      
      await apiRequest('POST', endpoint);
      
      // Limpiar estado de autenticación
      setUser(null);
      setCompanyId(null);
      
      // Determinar a qué página redirigir
      let loginPage = '/auth/login';
      if (location.startsWith('/mobile-app')) {
        loginPage = '/mobile-app/login';
      } else if (location.startsWith('/platform')) {
        loginPage = '/platform/login';
      }
      
      // Redirigir al login correspondiente
      navigate(loginPage);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setError(err as Error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar sesión correctamente",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      companyId,
      loading,
      error,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  
  return context;
}