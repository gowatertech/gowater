import { Request, Response, NextFunction } from 'express';
import { setCurrentCompanyId } from '../company-db';

/**
 * Middleware para asegurar que los endpoints móviles 
 * tengan acceso al ID de la empresa actual
 */
export function mobileApiTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extraer companyId de diferentes fuentes (en orden de prioridad)
  
  // 1. Si el usuario está autenticado, usar su companyId
  if (req.session.user && req.session.user.companyId) {
    req.session.companyId = req.session.user.companyId;
    console.log(`MobileAPI - Usando companyId del usuario autenticado: ${req.session.companyId}`);
  } 
  // 2. Si hay un companyId en la query, usarlo
  else if (req.query.companyId) {
    req.session.companyId = parseInt(req.query.companyId as string);
    console.log(`MobileAPI - Usando companyId de query parameter: ${req.session.companyId}`);
  }
  // 3. Si hay un companyId en el body, usarlo
  else if (req.body && req.body.companyId) {
    req.session.companyId = parseInt(req.body.companyId as string);
    console.log(`MobileAPI - Usando companyId de body: ${req.session.companyId}`);
  }
  // 4. En modo desarrollo/demostración
  else if (!req.session.companyId) {
    // En entorno de producción, esto debería redirigir a la página de login
    // pero para desarrollo asignamos un valor predeterminado
    req.session.companyId = 1;
    console.log(`MobileAPI - ADVERTENCIA: Asignando companyId por defecto: ${req.session.companyId}`);
  }
  
  // Establecer el companyId en el contexto actual para las operaciones con la DB
  setCurrentCompanyId(req.session.companyId);
  
  // Continuar con el siguiente middleware
  next();
}

/**
 * Middleware para verificar autenticación en rutas móviles protegidas
 */
export function mobileAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    console.log("MobileAPI - Acceso denegado: Usuario no autenticado");
    return res.status(401).json({
      success: false,
      message: "Acceso denegado. Por favor inicie sesión."
    });
  }
  
  // Usuario autenticado, continuar
  next();
}

/**
 * Middleware para verificar roles específicos en rutas móviles
 * @param allowedRoles Lista de roles permitidos
 */
export function mobileRoleMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      console.log("MobileAPI - Acceso denegado: Usuario no autenticado");
      return res.status(401).json({
        success: false,
        message: "Acceso denegado. Por favor inicie sesión."
      });
    }
    
    if (!allowedRoles.includes(req.session.user.role)) {
      console.log(`MobileAPI - Acceso denegado: Rol no permitido (${req.session.user.role})`);
      return res.status(403).json({
        success: false,
        message: "No tiene permisos para acceder a este recurso."
      });
    }
    
    // Usuario con rol permitido, continuar
    next();
  };
}