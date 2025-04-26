import { Request, Response, NextFunction } from "express";
import { setCurrentCompanyId, getCurrentCompanyId } from "../company-db";

/**
 * Middleware consolidado para gestionar el contexto multi-tenant
 * Establece el companyId de manera consistente basado en múltiples fuentes
 */
export function consolidatedCompanyMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Prioridad para la sesión
  if (req.session && req.session.companyId) {
    setCurrentCompanyId(req.session.companyId);
    console.log(`[Company Middleware] Usando companyId de sesión: ${req.session.companyId}`);
    return next();
  }
  
  // 2. Prioridad para el token JWT (si está implementado)
  if (req.user && 'companyId' in req.user) {
    setCurrentCompanyId(req.user.companyId);
    console.log(`[Company Middleware] Usando companyId de token: ${req.user.companyId}`);
    return next();
  }
  
  // 3. Para rutas de API, requerir autenticación
  if (req.path.startsWith('/api/') && 
      !req.path.startsWith('/api/public/') && 
      !req.path.startsWith('/api/login')) {
    console.log(`[Company Middleware] No hay companyId para ruta protegida: ${req.path}`);
    return res.status(401).json({ error: "Autenticación requerida" });
  }
  
  // 4. Para otras rutas, continuar sin companyId
  console.log(`[Company Middleware] Ruta no protegida, continuando: ${req.path}`);
  next();
}

/**
 * Logger especializado para operaciones multi-tenant
 */
export function logTenantOperation(req: Request, operation: string, details: any) {
  console.log(`[TENANT-OP][${operation}] Path: ${req.path}, CompanyId: ${getCurrentCompanyId() || 'NONE'}, Details:`, details);
}