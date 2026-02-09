import { Request, Response, NextFunction } from "express";
import { platformStorage } from "./platform-storage";

// Interfaz extendida para la sesión
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      name: string;
      role: string;
      companyId?: number;
      isPlatformUser?: boolean;
      email?: string;
      username?: string;
    };
    companyId?: number;
  }
}

import { setCurrentCompanyId } from "./company-db";

/**
 * Middleware para detectar y establecer el tenant (empresa) actual
 * basado en subdominios, headers o sesión
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  if (req.path.startsWith('/api/platform') ||
      req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/user' ||
      req.path === '/api/authtest' || req.path === '/api/mobile/login' || req.path === '/api/mobile/logout' ||
      req.path.startsWith('/api/public/') || req.path.startsWith('/api/leads/') || req.path === '/api/contact') {
    return next();
  }
  
  if (!req.session.companyId) {
    return res.status(401).json({ message: "No autenticado" });
  }

  setCurrentCompanyId(req.session.companyId);
  return next();
}

/**
 * Middleware para verificar permisos basados en roles
 * @param allowedRoles Roles permitidos para acceder al recurso
 */
export function checkRoleMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar si el usuario está autenticado
    if (!req.session.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    // Verificar si el rol del usuario está permitido
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Acceso denegado - Rol no autorizado" });
    }
    
    // Si es un usuario de empresa, verificar que pertenezca a la empresa actual
    if (!req.session.user.isPlatformUser && 
        req.session.user.companyId !== req.session.companyId &&
        !req.path.startsWith('/api/platform')) {
      return res.status(403).json({ message: "Acceso denegado - Usuario no pertenece a esta empresa" });
    }
    
    next();
  };
}

/**
 * Middleware que agrega el companyId a todas las consultas
 * para asegurar separación de datos entre empresas
 */
export function companyFilterMiddleware(req: Request, res: Response, next: NextFunction) {
  // Solo aplicar para rutas que no sean de plataforma
  if (req.path.startsWith('/api/platform')) {
    return next();
  }
  
  // Solo aplicar si hay un companyId en la sesión
  if (req.session.companyId) {
    // Para peticiones GET, agregar companyId como query param
    if (req.method === 'GET' && !req.query.companyId) {
      req.query.companyId = req.session.companyId.toString();
    }
    
    // Para otras peticiones, agregar companyId al body
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && !req.body.companyId) {
      req.body.companyId = req.session.companyId;
    }
  }
  
  next();
}