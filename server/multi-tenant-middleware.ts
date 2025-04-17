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

/**
 * Middleware para detectar y establecer el tenant (empresa) actual
 * basado en subdominios, headers o sesión
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Primero intenta obtener el tenant del subdominio
  const hostHeader = req.headers.host || "";
  const hostParts = hostHeader.split(".");
  
  async function processRequest() {
    try {
      // Si es un subdominio y no es www, api, etc.
      if (hostParts.length > 1 && !["www", "api", "admin", "platform"].includes(hostParts[0])) {
        const subdomain = hostParts[0];
        const company = await platformStorage.getCompanyBySubdomain(subdomain);
        
        if (company) {
          // Establece la empresa en la sesión
          req.session.companyId = company.id;
        }
      }
      
      // Luego verifica si hay un header específico (útil para APIs)
      const companyIdHeader = req.headers["x-company-id"];
      if (companyIdHeader && typeof companyIdHeader === "string") {
        const companyId = parseInt(companyIdHeader);
        const company = await platformStorage.getCompany(companyId);
        
        if (company) {
          req.session.companyId = company.id;
        }
      }
      
      // Finalmente, si hay un usuario en sesión con companyId, úsalo
      if (req.session.user?.companyId) {
        req.session.companyId = req.session.user.companyId;
      }
      
      // Si la ruta comienza con /platform, no aplicar restricciones de tenant
      if (req.path.startsWith('/api/platform')) {
        return next();
      }
      
      // Para rutas no de plataforma, verificar si se requiere companyId
      if (!req.session.companyId && !req.path.startsWith('/api/auth')) {
        // Redirigir a la plataforma si no hay companyId
        return res.status(403).json({ 
          message: "Acceso denegado - No se ha seleccionado una empresa",
          redirectTo: "/platform/select-company"
        });
      }
      
      next();
    } catch (error) {
      console.error("Error en tenant middleware:", error);
      next(error);
    }
  }
  
  processRequest();
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