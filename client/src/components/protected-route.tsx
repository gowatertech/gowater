import React from 'react';
import { Redirect, Route, useRoute } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export const ProtectedRoute = ({ path, component: Component }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const [isActive] = useRoute(path);

  // Si está cargando, mostramos un spinner
  if (isLoading && isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario (no autenticado), redirigimos a /auth
  if (!isLoading && !user && isActive) {
    return <Redirect to="/auth" />;
  }

  // Si está autenticado, mostramos la ruta con el componente
  return <Route path={path} component={Component} />;
};