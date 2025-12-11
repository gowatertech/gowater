import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Definir la interfaz para los datos del usuario
export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  role: string;
  companyId: number;
  active?: boolean;
}

// Definir la interfaz para el estado de la empresa
export interface CompanyStatus {
  id: number;
  name: string;
  status: string;
  suspended: boolean;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  expirationDate?: string | null;
  gracePeriodEnds?: string | null;
}

// Definir la interfaz para el contexto de autenticación
interface AuthContextType {
  user: User | null;
  companyId: number | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  companyStatus: CompanyStatus | null;
  isSuspended: boolean;
}

// Crear el contexto con un valor por defecto
const AuthContext = createContext<AuthContextType | null>(null);

// Hook personalizado para acceder al contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

// Componente proveedor que envuelve la aplicación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Verificar estado de suspensión de la empresa
  const checkCompanyStatus = async (): Promise<CompanyStatus | null> => {
    try {
      const response = await fetch('/api/company-status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.company) {
          setCompanyStatus(data.company);
          return data.company;
        }
      }
    } catch (err) {
      console.error('Error al verificar estado de empresa:', err);
    }
    return null;
  };
  
  // Función para iniciar sesión
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Realizar solicitud de inicio de sesión
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Importante para que las cookies se envíen
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar sesión');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }
      
      // Actualizar estado con los datos del usuario
      setUser(data.user);
      setCompanyId(data.user.companyId);
      
      // Verificar estado de la empresa
      const status = await checkCompanyStatus();
      
      // Si la empresa está suspendida, mostrar mensaje
      if (status?.suspended) {
        toast({
          title: "Cuenta Suspendida",
          description: status.suspensionReason || "Su cuenta ha sido suspendida. Contacte al administrador.",
          variant: "destructive",
        });
        setLocation('/suspended');
        return;
      }
      
      // Mostrar notificación de éxito
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido/a, ${data.user.name}`,
      });
      
      // Redireccionar al dashboard
      setLocation('/dashboard');
    } catch (err) {
      console.error('Error de autenticación:', err);
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      
      // Mostrar notificación de error
      toast({
        title: "Error de autenticación",
        description: err instanceof Error ? err.message : 'Error al iniciar sesión',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cerrar sesión
  const logout = async () => {
    setIsLoading(true);
    
    try {
      // Realizar solicitud de cierre de sesión
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cerrar sesión');
      }
      
      // Limpiar estado de usuario
      setUser(null);
      setCompanyId(null);
      setCompanyStatus(null);
      
      // Invalidar todas las consultas en caché
      queryClient.clear();
      
      // Redireccionar a la página de inicio de sesión
      setLocation('/auth');
      
      // Mostrar notificación de éxito
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      
      // Mostrar notificación de error
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Error al cerrar sesión',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar información del usuario al iniciar la aplicación
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true);
      
      try {
        // Verificar si hay un usuario en sesión
        const response = await fetch('/api/user', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.user) {
            setUser(data.user);
            setCompanyId(data.companyId || data.user.companyId);
            
            // Verificar estado de la empresa
            await checkCompanyStatus();
          } else {
            setUser(null);
            setCompanyId(null);
            setCompanyStatus(null);
          }
        } else {
          // Si hay error, asumir que no hay sesión activa
          setUser(null);
          setCompanyId(null);
          setCompanyStatus(null);
        }
      } catch (err) {
        console.error('Error al obtener usuario actual:', err);
        setUser(null);
        setCompanyId(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Valores que se proveerán al contexto
  const value = {
    user,
    companyId,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    companyStatus,
    isSuspended: companyStatus?.suspended ?? false,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}