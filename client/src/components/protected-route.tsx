import { Redirect, Route, useRoute } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { hasRouteAccess, getDefaultRedirect, type UserRole } from '@shared/permissions';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export const ProtectedRoute = ({ path, component: Component }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const [isActive] = useRoute(path);

  if (isLoading && isActive) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && !user && isActive) {
    return <Redirect to="/auth/login" />;
  }

  if (!isLoading && user && isActive) {
    const role = (user.role || "admin") as UserRole;
    if (!hasRouteAccess(role, path)) {
      const redirect = getDefaultRedirect(role);
      return <Redirect to={redirect} />;
    }
  }

  return <Route path={path} component={Component as any} />;
};
