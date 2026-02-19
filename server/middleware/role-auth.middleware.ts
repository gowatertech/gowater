import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../shared/permissions';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session?.user || req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: "Autenticación requerida",
        message: "Debe iniciar sesión para acceder a este recurso"
      });
    }

    const userRole = (user as any).role as UserRole;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Acceso denegado",
        message: "No tiene permisos para acceder a este recurso"
      });
    }

    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireAdminOrSupervisor = requireRole("admin", "supervisor");
export const requireDashboardAccess = requireRole("admin", "supervisor", "cashier");
export const requireDriverAccess = requireRole("driver", "assistant");
export const requireOperationsAccess = requireRole("admin", "supervisor");
