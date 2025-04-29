import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Route, Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  children: ReactNode;
  roles?: string[]; // Roles permitidos para acceder a esta ruta
}

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirige a la página de login si el usuario no está autenticado
 * Opcionalmente verifica que el usuario tenga uno de los roles permitidos
 */
export function ProtectedRoute({ path, children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  
  return (
    <Route path={path}>
      {() => {
        // Mostrar loader mientras se verifica la autenticación
        if (loading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Verificando autenticación...</span>
            </div>
          );
        }
        
        // Si no está autenticado, redirigir al login
        if (!isAuthenticated) {
          // Determinar a qué página de login redirigir
          let loginPath = '/auth/login';
          if (path.startsWith('/mobile-app')) {
            loginPath = '/mobile-app/login';
          } else if (path.startsWith('/platform')) {
            loginPath = '/platform/login';
          }
          
          // Guardar la URL actual para redireccionar después del login
          const returnUrl = encodeURIComponent(path);
          return <Redirect to={`${loginPath}?returnUrl=${returnUrl}`} />;
        }
        
        // Si se especificaron roles, verificar que el usuario tenga uno de ellos
        if (roles && roles.length > 0 && user) {
          if (!roles.includes(user.role)) {
            return (
              <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
                <p className="mt-2 text-muted-foreground">
                  No tienes permiso para acceder a esta página.
                </p>
                <p className="text-sm text-muted-foreground">
                  Se requiere uno de estos roles: {roles.join(', ')}
                </p>
              </div>
            );
          }
        }
        
        // Si está autenticado y tiene los permisos necesarios, mostrar el contenido
        return <>{children}</>;
      }}
    </Route>
  );
}